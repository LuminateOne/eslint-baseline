
# eslint-baseline
Basic baseline checking for eslint in CI pipelines

Ever inherited project that never had any linting?  Potentially hundreds/thousands of linting issues?  This package allows you to create a baseline so you can insure your code quality on changes and deal with the existing issues on your own timeline

inspired by the phpstan baseline https://phpstan.org/user-guide/baseline

## installation
```npm install eslint-baseline```
## usage
The command is a simple wrapper around eslint so it will use all your existing config files and command line options as eslint

```npx eslint-baseline file1.js ```

All command line arguments are passed through to eslint see https://eslint.org/docs/latest/user-guide/command-line-interface, the only caveat is the format is changed to json

If no baseline file exists  one will be created on first run '.eslint-baseline.json' 

Simply run a second time to verify if there are any new issues since the baseline was created

```npx eslint-baseline file2.js ```

**Do not forget to commit your .eslint-baseline.json file**

Add the command to your CI pipeline to prevent code regressions

To recreate your baseline file, delete the existing file and rerun npx eslint-baseline

