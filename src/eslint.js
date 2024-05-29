import {execa} from "execa";
import * as path from 'path'
import * as objectHash from 'object-hash';

async function execute(args = []) {

    // default to provided args
    args = process.argv;
    args.shift(); // remove node
    args.shift(); // remove command

    // default output to json, pass through all other args
    args = ['eslint', '-f', 'json', ...args];


    // run eslint
    let stdout = '';
    try {
        let result = await execa('npx', args, {env: {...process.env}});
        stdout = result.stdout;
    } catch (error) {

        // eslint throws an error on lint fail...

        if (error.exitCode !== 1) {
            console.error(error.stderr);
            return null;
        }

        stdout = error.stdout;
    }

    // extract rules
    let json = JSON.parse(stdout);
    let result = {};
    json.forEach((file) => {

        file.messages.forEach((message) => {
            if (message.severity >= 2) {

                let filePath = path.relative(process.cwd(), file.filePath);

                if (!result[filePath]) {
                    result[filePath] = {};
                }

                if (!result[filePath][message.ruleId]) {
                    result[filePath][message.ruleId] = [];
                }

                result[filePath][message.ruleId].push({
                    path: filePath,
                    line: message.line,
                    column: message.column,
                    ruleId: message.ruleId,
                    message: message.message,
                    hash: objectHash.sha1({
                        filePath,
                        ruleId: message.ruleId,
                    })
                });
            }
        });
    });

    // Sort results alphabetically by file path, then by rule id, then by line number
    const sortedResult = {};

    for (const filePath of Object.keys(result).sort()) {
        sortedResult[filePath] = result[filePath];
    }

    for (const filePath of Object.keys(sortedResult)) {
        const sortedRules = {};
        const ruleIds = Object.keys(sortedResult[filePath]).sort();

        for (const ruleId of ruleIds) {
            sortedRules[ruleId] = sortedResult[filePath][ruleId];
        }

        sortedResult[filePath] = sortedRules;
    }

    for (const filePath of Object.keys(sortedResult)) {
        for (const ruleId of Object.keys(sortedResult[filePath])) {
            sortedResult[filePath][ruleId].sort((a, b) => {
                if (a.line < b.line) {
                    return -1;
                } else if (a.line > b.line) {
                    return 1;
                } else {
                    return 0;
                }
            });
        }
    }

    result = sortedResult;

    return result;
}

export default {
    execute
}
