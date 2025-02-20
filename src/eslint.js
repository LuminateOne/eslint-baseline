import { execa } from "execa";
import * as path from 'path'
import * as objectHash from 'object-hash';

async function execute(args = []) {

    // default to provided args
    args = process.argv;
    args.shift(); // remove node
    args.shift(); // remove command

    // default output to json, pass through all other args
    args = ['eslint', '-f', 'json',  ...args];


    // run eslint 
    let stdout = '';
    try {
        let result = await execa('npx', args, { env: { ...process.env } });
        stdout = result.stdout;
    } catch (error) {

        // eslint throws an error on lint fail...

        if(error.exitCode !== 1) {
            console.error(error.stderr);
            return null;
        }

        stdout = error.stdout;
    }

    // extract rules
    let json = JSON.parse(stdout);
    let result = [];
    json.forEach((file) => {

        file.messages.forEach((message) => {
            if (message.severity >= 2) {

                let filePath = path.relative(process.cwd(), file.filePath);
                const sanitizedfilePath = filePath.replaceAll('\\', '/');

                result.push({
                    path: sanitizedfilePath,
                    line: message.line,
                    column: message.column,
                    ruleId: message.ruleId,
                    message: message.message,
                    hash: objectHash.sha1({
                        filePath: sanitizedfilePath,
                        line: message.line,
                        column: message.column, // TODO: optional?
                        ruleId: message.ruleId
                    })
                });
            }
        });
    });

    return result;
}

export default {
    execute
}
