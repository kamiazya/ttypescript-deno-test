"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ts = __importStar(require("typescript"));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function default_1(_program, _pluginOptions) {
    return (context) => {
        return (source) => {
            const sourceFileName = source.getSourceFile().fileName;
            return ts.visitNode(source, visitorFactory(sourceFileName, context));
        };
    };
}
exports.default = default_1;
/**
 * visitor factory
 * @param sourceFileName source file name
 * @param context transformation context
 * @returns visitor
 */
function visitorFactory(sourceFileName, context) {
    return (node) => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            // "import" / "export from" statement
            return ts.visitEachChild(node, visitorResolverFactory(sourceFileName), context);
        }
        else {
            return ts.visitEachChild(node, visitorFactory(sourceFileName, context), context);
        }
    };
}
/**
 * resolver factory
 * @param sourceFileName source file name
 * @returns visitor
 */
function visitorResolverFactory(sourceFileName) {
    return (node) => {
        if (!ts.isStringLiteral(node)) {
            return node;
        }
        // resolve if node is StringLiteral in ImportDeclaration/ExportDeclaration
        const moduleName = node.text;
        const baseDir = path_1.default.dirname(sourceFileName);
        const resolvedModuleName = resolveModuleExtension(moduleName, baseDir);
        return ts.createStringLiteral(resolvedModuleName);
    };
}
/**
 * resolves module name
 * @param moduleName modle name
 * @param baseDirName base directory
 * @returns resolved module name
 */
function resolveModuleExtension(moduleName, baseDirName) {
    if (!shouldResolveModuleExtension(moduleName)) {
        return moduleName;
    }
    const resolvedPath = resolveModulePath(moduleName, baseDirName);
    for (const ext of ['', '.ts', '.js', '/index.ts', '/index.js']) {
        const resolvedName = `${resolvedPath}${ext}`;
        if (isFile(resolvedName)) {
            // resolved
            return `${moduleName}${ext}`;
        }
    }
    // not resolved
    console.warn(`[WARN] Module not resolved: ${moduleName}`);
    return moduleName;
}
/**
 * should resolve?
 * @param moduleName module name
 * @returns Yes/No
 */
function shouldResolveModuleExtension(moduleName) {
    if (path_1.default.isAbsolute(moduleName)) {
        // absolute path
        return true;
    }
    if (moduleName.startsWith('.')) {
        // relative path
        return true;
    }
    return false;
}
/**
 * resolve module path
 * @param moduleName module name to resolve
 * @param baseDir base directory
 * @returns resolved path
 */
function resolveModulePath(moduleName, baseDir) {
    if (path_1.default.isAbsolute(moduleName)) {
        return moduleName;
    }
    else {
        return path_1.default.resolve(baseDir, moduleName);
    }
}
/**
 * is fileName file?
 * @param fileName filename to check
 * @returns Yes/No
 */
function isFile(fileName) {
    try {
        const stats = fs_1.default.statSync(fileName);
        return stats.isFile();
    }
    catch (err) {
        return false;
    }
}
