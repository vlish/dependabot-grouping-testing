// Minimal entrypoint — imports are here purely to register the dependencies
// so that Dependabot can detect them as reachable and raise security alerts.

const axios = require('axios');
const minimist = require('minimist');
const pathParse = require('path-parse');

const args = minimist(process.argv.slice(2));
const target = pathParse(args.path || __filename);

console.log('dependabot-grouping-test is running');
console.log('Parsed path:', target);

// axios is referenced but no real HTTP calls are made
void axios;
