/* eslint-disable @typescript-eslint/no-unused-vars */
import fs from "fs";
import path from "path";
import * as ts from "typescript";

export default function (
  _program: ts.Program,
  _pluginOptions: unknown
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    return (source: ts.SourceFile): ts.SourceFile => {
      const sourceFileName = source.getSourceFile().fileName;
      return ts.visitNode(source, visitorFactory(sourceFileName, context));
    };
  };
}

/**
 * visitor factory
 * @param sourceFileName source file name
 * @param context transformation context
 * @returns visitor
 */
function visitorFactory(
  sourceFileName: string,
  context: ts.TransformationContext
): ts.Visitor {
  return (node: ts.Node): ts.VisitResult<ts.Node> => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      // "import" / "export from" statement
      return ts.visitEachChild(
        node,
        visitorResolverFactory(sourceFileName),
        context
      );
    } else {
      return ts.visitEachChild(
        node,
        visitorFactory(sourceFileName, context),
        context
      );
    }
  };
}

/**
 * resolver factory
 * @param sourceFileName source file name
 * @returns visitor
 */
function visitorResolverFactory(sourceFileName: string): ts.Visitor {
  return (node: ts.Node): ts.VisitResult<ts.Node> => {
    if (!ts.isStringLiteral(node)) {
      return node;
    }

    // resolve if node is StringLiteral in ImportDeclaration/ExportDeclaration
    const moduleName = node.text;
    const baseDir = path.dirname(sourceFileName);
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
function resolveModuleExtension(
  moduleName: string,
  baseDirName: string
): string {
  if (!shouldResolveModuleExtension(moduleName)) {
    return moduleName;
  }

  const resolvedPath = resolveModulePath(moduleName, baseDirName);
  for (const ext of ["", ".ts", ".js", "/index.ts", "/index.js"]) {
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
function shouldResolveModuleExtension(moduleName: string): boolean {
  if (path.isAbsolute(moduleName)) {
    // absolute path
    return true;
  }
  if (moduleName.startsWith(".")) {
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
function resolveModulePath(moduleName: string, baseDir: string): string {
  if (path.isAbsolute(moduleName)) {
    return moduleName;
  } else {
    return path.resolve(baseDir, moduleName);
  }
}

/**
 * is fileName file?
 * @param fileName filename to check
 * @returns Yes/No
 */
function isFile(fileName: string): boolean {
  try {
    const stats = fs.statSync(fileName);
    return stats.isFile();
  } catch (err) {
    return false;
  }
}
