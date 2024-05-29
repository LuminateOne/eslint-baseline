import {execa} from "execa";

async function execute(args = []) {

    // default to provided args
    args = process.argv;
    args.shift(); // remove node
    args.shift(); // remove command

    // default output to json, pass through all other args
    args = ['eslint', '-f', 'json', ...args];

    let stdout = '';
    try {
        let result = await execa('npx', args, {env: {...process.env}});
        stdout = result.stdout;
    } catch (error) {
        console.error(error.stderr);

        if (error.exitCode !== 1) {
            console.error(error.stderr);
            return null;
        }

        stdout = error.stdout;
    }

    return JSON.parse(stdout);
}

export default {
    execute
}
