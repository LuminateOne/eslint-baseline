import * as path from "path";
import * as fs from 'fs';
import * as objectHash from "object-hash";

/**
 * Get trimmed lines from file, indexed by line number
 * @param {string }filePath
 * @returns {{[key: int]: string}}
 */
const getFileLinesTrimmed = (filePath) => {
    const lines = {};

    const file = fs.readFileSync(filePath);
    const fileLines = file.split("\n");
    for (const [index, line] of fileLines.entries()) {
        lines[index + 1] = line.trimStart().trimEnd() + "\n";
    }

    return lines;
}

/**
 * Create baseline object from eslint result
 * @param eslintResult
 * @returns {{
 *      [key: string]: {
 *          [key: string]: {
 *              path: string,
 *              context: string,
 *              ruleId: string,
 *              hash: string
 *          }[]
 *      }
 *  }}
 */
export const createFromEslintResult = (eslintResult) => {
    const result = {};

    const sortedFiles = Object.values(eslintResult).sort((a, b) => {
        if (a.filePath < b.filePath) {
            return -1;
        } else if (a.filePath > b.filePath) {
            return 1;
        } else {
            return 0;
        }
    });

    for (const file of sortedFiles) {
        if (file.errorCount === 0 && file.warningCount === 0) {
            continue;
        }

        const filePath = path.relative(process.cwd(), file.filePath);
        const fileLines = getFileLinesTrimmed(file.filePath);

        if (!result[filePath]) {
            result[filePath] = {};
        }

        const sortedMessages = file.messages.sort((a, b) => {
            if (a.ruleId < b.ruleId) {
                return -2;
            } else if (a.ruleId > b.ruleId) {
                return 2;
            } else if (a.line < b.line) {
                return -1;
            } else if (a.line > b.line) {
                return 1;
            } else {
                return 0;
            }
        });

        for (const message of sortedMessages) {
            if (!result[filePath][message.ruleId]) {
                result[filePath][message.ruleId] = [];
            }

            const context = (
                (fileLines[message.line - 1] ?? '')
                + (fileLines[message.line] ?? '')
                + (fileLines[message.line + 1] ?? '')
            );

            result[filePath][message.ruleId].push({
                path: filePath,
                context,
                ruleId: message.ruleId,
                hash: objectHash.sha1({
                    filePath,
                    ruleId: message.ruleId,
                    context,
                })
            });
        }
    }

    return result;
}

/**
 * Get eslint result messages that are not present in baseline
 * @param eslintResult
 * @param baseline
 * @returns {
 *      {
 *          path: string,
 *          ruleId: string,
 *          line: int,
 *          column: int,
 *          message: string,
 *      }[]
 *  }
 */
export const getFilteredMessages = (eslintResult, baseline) => {
    const fails = [];

    for (const file of Object.values(eslintResult)) {
        const filePath = path.relative(process.cwd(), file.filePath);

        if (!baseline[filePath]) {
            fails.push(...file.messages.map(
                x => ({...x, path: filePath})
            ));
            continue;
        }

        const fileLines = getFileLinesTrimmed(file.filePath);

        for (const message of file.messages) {
            if (!baseline[filePath][message.ruleId]) {
                fails.push({
                    ...message,
                    path: filePath,
                });
                continue;
            }

            const context = (
                (fileLines[message.line - 1] ?? '')
                + (fileLines[message.line] ?? '')
                + (fileLines[message.line + 1] ?? '')
            );

            const hash = objectHash.sha1({
                filePath,
                ruleId: message.ruleId,
                context,
            });

            if (!baseline[filePath][message.ruleId].some(x => x.hash === hash)) {
                fails.push({
                    ...message,
                    path: filePath,
                });
            }
        }
    }

    return fails;
}
