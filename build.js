
import fs from 'fs';

function convertToEsModule() {
    if (!fs.existsSync("./dist")){
        fs.mkdirSync("./dist");
    }
    const input = fs.readFileSync('./keyshapejs.js', {encoding:'utf8', flag:'r'});
    // strip off head and tail lines
    let output = "";
    let moduleLine = false;
    for (let line of input.split('\n')) {
        if (line == "/* module-end */") {
            moduleLine = false;
        }
        if (moduleLine || output == "") {
            output += line + '\n';
        }
        if (line == "/* module-start */") {
            moduleLine = true;
        }
    }
    // add exports
    let version = input.match(/'version': '([.0-9]+)'/);
    output += "const version = '"+version[1]+"';\n\n";
    output += 'export { version, animate, add, remove, removeAll, timelines, globalPlay, globalPause, globalState };\n';
    fs.writeFileSync('./dist/keyshapejs.es.js', output, {encoding:'utf8'})
}

convertToEsModule();
