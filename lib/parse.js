const path = require('path');                                                         // 路径操作
const md5 = require('js-md5');                                                        // md5加密
const vueCompiler = require('@vue/compiler-dom');                                     // Vue编译器
const tsCompiler = require('typescript');                                             // TS编译器
const { getCode, writeTsFile } = require(path.join(__dirname, './file'));             // 文件工具

// 解析vue文件中的ts script片段，解析获取ast，checker
exports.parseVue = function(fileName) {
    // 获取vue代码
    const vueCode = getCode(fileName);
    // 解析vue代码
    const result = vueCompiler.parse(vueCode);
    const children = result.children;
    // 获取script片段
    let tsCode = '';
    let baseLine = 0;
    children.forEach(element => {
      if (element.tag == 'script') {
        tsCode = element.children[0].content;
        baseLine = element.loc.start.line - 1;
      }
    });
    // console.log(tsCode);
    // console.log(baseLine);
    const ts_hash_name = md5(fileName);
    // 创建一个 SourceFile 对象
    const sourceFile = tsCompiler.createSourceFile(
      `${ts_hash_name}.ts`,
      tsCode,
      tsCompiler.ScriptTarget.Latest, // 或者指定其他 ECMAScript 版本
      true // 设置为 true 以指示这是一个独立的 source 文件
    );

    // 创建一个 CompilerHost
    const compilerHost = {
      fileExists: tsCompiler.sys.fileExists,
      readFile: tsCompiler.sys.readFile,
      getSourceFile: (fileName, languageVersion) => {
          if (fileName === `${ts_hash_name}.ts`) {
              return sourceFile;
          }
          return tsCompiler.createSourceFile(fileName, tsCompiler.sys.readFile(fileName), languageVersion);
      },
      getDefaultLibFileName: options => tsCompiler.getDefaultLibFilePath(options),
      writeFile: tsCompiler.sys.writeFile,
      getCurrentDirectory: tsCompiler.sys.getCurrentDirectory,
      getDirectories: tsCompiler.sys.getDirectories,
      getCanonicalFileName: fileName => tsCompiler.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
      getNewLine: () => tsCompiler.sys.newLine,
      useCaseSensitiveFileNames: () => tsCompiler.sys.useCaseSensitiveFileNames,
    };

    // 创建一个 Program
    const program = tsCompiler.createProgram({
      rootNames: [`${ts_hash_name}.ts`],
      options: {
          target: tsCompiler.ScriptTarget.Latest,
          module: tsCompiler.ModuleKind.ESNext
      },
      host: compilerHost
    });

    const ast = program.getSourceFile(`${ts_hash_name}.ts`);
    const checker = program.getTypeChecker();

    return { ast, checker, baseLine };
}

// 解析ts文件代码，获取ast，checker
exports.parseTs = function(fileName) {
    // 将ts代码转化为AST
    const program = tsCompiler.createProgram([fileName], {})
    const ast = program.getSourceFile(fileName);
    const checker = program.getTypeChecker();
    // console.log(ast);
    return { ast, checker };
}