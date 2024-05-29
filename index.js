#!/usr/bin/env node

import eslint from './src/eslint.js';
import * as fs from 'fs';
import {createFromEslintResult, getFilteredMessages} from './src/baseline.js';

const FILE_NAME = '.eslint-baseline.json';

async function exec() {
    if (!fs.existsSync(FILE_NAME)) {
        console.log('baseline not found attempting to create...');

        const result = await eslint.execute();
        const baseline = createFromEslintResult(result);

        fs.appendFileSync(FILE_NAME, JSON.stringify(baseline, null, 4));

        console.log('baseline created successfully');

        process.exit(1);
        return;
    }

    const baselineContent = fs.readFileSync(FILE_NAME);
    const baseline = JSON.parse(baselineContent);

    // run eslint
    const result = await eslint.execute();

    if (result === null) {
        console.error('eslint failed to run, baseline aborting...');
        process.exit(1);
    }

    // compose eslint result with baseline
    const fails = getFilteredMessages(result, baseline);

    console.info('eslint baseline compare results:')
    console.info();

    // check results
    if (fails.length > 0) {
        for (let fail of fails) {
            console.error(` - ${fail.path}, line ${fail.line}:${fail.column}, rule ${fail.ruleId}, ${fail.message}`);
        }
        console.error();
        console.error(` [fail] ${fails.length} issues found !!!`)
        process.exit(1);
    } else {
        console.info(' [OK] no issues found ');
    }
}


exec().catch(x => console.error(x));
