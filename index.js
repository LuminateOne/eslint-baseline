#!/usr/bin/env node

import eslint from './src/eslint.js';
import * as fs from 'fs';

const FILE_NAME = '.eslint-baseline.json';

async function exec(){
    
    if(!fs.existsSync(FILE_NAME)){
        console.log('baseline not found attempting to create...');
        let result = await eslint.execute();
        fs.appendFileSync(FILE_NAME, JSON.stringify(result, null, 4) );
        console.log('baseline created successfully');
        process.exit(1);
        return;
    }

    let baselineContent = fs.readFileSync(FILE_NAME);
    let baseline = JSON.parse(baselineContent);

    // create the hash collection
    let baselineHash = [];
    baseline.forEach(x => baselineHash.push(x.hash));

    // run eslint 
    let result = await eslint.execute();
    
    // compose eslint result with baseline
    let fails = [];
    result.forEach(x => {
        
        if(!baselineHash.includes(x.hash)){
            // new issue not in the baseline
            fails.push(x);
        }
    });

    console.info('eslint baseline compare results:')
    console.info();
    
    // check results
    if(fails.length > 0) {
        for(let fail of fails){
            console.error(` - ${fail.path}, line ${fail.line}, rule ${fail.ruleId}, ${fail.message}`);
        }
        console.error();
        console.error(` [fail] ${fails.length} issues found !!!`)
        process.exit(1);
    }else{
        console.info(' [OK] no issues found ');
    }

}


exec().catch(x => console.error(x));