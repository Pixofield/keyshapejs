var gulp = require('gulp');
const rename = require('gulp-rename');
var through2 = require('through2');

function convertToEsModule() {
    return through2.obj(function(file, _enc, done) {
        // strip off head and tail lines
        var input = file.contents.toString();
        var output = "";
        var moduleLine = false;
        for (line of input.split('\n')) {
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
        var version = input.match(/'version': '([.0-9]+)'/);
        output += "const version = '"+version[1]+"';\n\n";
        output += 'export { version, animate, add, remove, removeAll, timelines, globalPlay, globalPause, globalState };\n';
        file.contents = Buffer.from(output);
        done(null, file);
    });
}

// converts the source file to a JS module
function esmodule() {
    return gulp.src('./keyshapejs.js')
        .pipe(convertToEsModule())
        .pipe(rename({ extname: '.es.js' }))
        .pipe(gulp.dest('./dist'));
}

exports.esmodule = esmodule
exports.default = esmodule
