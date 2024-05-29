#!/usr/bin/env node

import eslint from './src/eslint.js';
import * as fs from 'fs';

const FILE_NAME = '.eslint-baseline-grouped.json';

async function exec() {

    if (!fs.existsSync(FILE_NAME)) {
        console.log('baseline not found attempting to create...');
        let result = await eslint.execute();
        fs.appendFileSync(FILE_NAME, JSON.stringify(result, null, 4));
        console.log('baseline created successfully');
        process.exit(1);
        return;
    }

    let baselineContent = fs.readFileSync(FILE_NAME);
    let baseline = JSON.parse(baselineContent);

    // run eslint
    let result = await eslint.execute();

    if (result === null) {
        console.error('eslint failed to run, baseline aborting...');
        process.exit(1);
    }

    // compose eslint result with baseline
    let fails = [];
    for (const [filePath, errors] in Object.values(result)) {
        if (baseline[filePath] === undefined) {
            // new file not in the baseline
            fails.push(...Object.values(errors));
            continue;
        }
        for (const [ruleId, messages] in Object.values(errors)) {
            if (baseline[filePath][ruleId] === undefined) {
                // new rule not in the baseline
                fails.push(...messages);
                continue;
            }

            for (const message of messages) {
                if (!baseline[filePath][ruleId].some((baselineMessage) => baselineMessage.hash === message.hash)) {
                    // new issue not in the baseline
                    fails.push(message);
                }
            }

            for (const baselineMessage of baseline[filePath][ruleId]) {
                if (!messages.some((message) => baselineMessage.hash === message.hash)) {
                    console.log(`issue fixed - removing from baseline: ${filePath}, rule ${ruleId}, ${baseline[filePath][ruleId].message}`);
                    baseline[filePath][ruleId].splice(baseline[filePath][ruleId].indexOf(baselineMessage), 1);
                }
            }
        }
    }

    console.info('eslint baseline compare results:')
    console.info();

    // check results
    if (fails.length > 0) {
        for (let fail of fails) {
            console.error(` - ${fail.path}, line ${fail.line}, rule ${fail.ruleId}, ${fail.message}`);
        }
        console.error();
        console.error(` [fail] ${fails.length} issues found !!!`)
        process.exit(1);
    } else {
        console.info(' [OK] no issues found ');
    }

    console.log('updating baseline with fixed issues...');
    fs.appendFileSync(FILE_NAME, JSON.stringify(baseline, null, 4));
    console.log('baseline updated successfully');
}


exec().catch(x => console.error(x));
