import * as path from "path";
import * as fs from 'fs';
import * as objectHash from "object-hash";

const getFileLinesTrimmed = (filePath) => {
    const lines = {};

    const file = fs.readFileSync(filePath, 'utf8');
    const fileLines = file.split('\n');
    for (const [index, line] of fileLines.entries()) {
        lines[index + 1] = line.trimStart().trimEnd();
    }

    return lines;
}

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
        if (file.errorCount === 0) {
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

            result[filePath][message.ruleId].push({
                path: filePath,
                context: fileLines[message.line],
                ruleId: message.ruleId,
                hash: objectHash.sha1({
                    filePath,
                    ruleId: message.ruleId,
                    context: fileLines[message.line],
                })
            });
        }
    }

    return result;
}

export const getFilteredMessages = (eslintResult, baseline) => {
    const fails = [];

    for (const file of Object.values(eslintResult)) {
        const filePath = path.relative(process.cwd(), file.filePath);

        if (!baseline[filePath]) {
            fails.push(...file.messages);
        }

        const fileLines = getFileLinesTrimmed(file.filePath);

        for (const message of file.messages) {
            if (!baseline[filePath][message.ruleId]) {
                fails.push(message);
                continue;
            }

            const hash = objectHash.sha1({
                filePath,
                ruleId: message.ruleId,
                context: fileLines[message.line],
            });

            if (!baseline[filePath][message.ruleId].some(x => x.hash === hash)) {
                fails.push(message);
            }
        }
    }

    return fails;
}
