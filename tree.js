import ts from "typescript";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SourceCodeTreeGenerator {
  constructor(filePaths, compilerOptions = {}) {
    this.filePaths = filePaths;
    this.program = ts.createProgram(filePaths, {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      ...compilerOptions,
    });
    this.checker = this.program.getTypeChecker();
  }

  generateTree() {
    const roots = [];

    for (const sourceFile of this.program.getSourceFiles()) {
      if (
        !sourceFile.isDeclarationFile &&
        this.filePaths.includes(sourceFile.fileName)
      ) {
        const fileNode = this.processSourceFile(sourceFile);
        if (fileNode) {
          roots.push(fileNode);
        }
      }
    }

    return roots;
  }

  processSourceFile(sourceFile) {
    const fileNode = {
      name: path.basename(sourceFile.fileName),
      type: "file",
      functions: [],
      children: [],
      path: sourceFile.fileName,
    };

    this.visitNode(sourceFile, fileNode);
    return fileNode;
  }

  visitNode(node, parent) {
    switch (node.kind) {
      case ts.SyntaxKind.ClassDeclaration:
        this.processClass(node, parent);
        break;
      case ts.SyntaxKind.InterfaceDeclaration:
        this.processInterface(node, parent);
        break;
      case ts.SyntaxKind.NamespaceDeclaration:
      case ts.SyntaxKind.ModuleDeclaration:
        this.processNamespace(node, parent);
        break;
      case ts.SyntaxKind.FunctionDeclaration:
        const funcInfo = this.processFunctionDeclaration(node);
        if (funcInfo) {
          parent.functions.push(funcInfo);
        }
        break;
      case ts.SyntaxKind.VariableStatement:
        this.processVariableStatement(node, parent);
        break;
      default:
        ts.forEachChild(node, (child) => this.visitNode(child, parent));
    }
  }

  processClass(classDecl, parent) {
    const className = classDecl.name?.text || "<anonymous>";
    const classNode = {
      name: className,
      type: "class",
      functions: [],
      children: [],
    };

    // Process class members
    classDecl.members.forEach((member) => {
      switch (member.kind) {
        case ts.SyntaxKind.MethodDeclaration:
          const methodInfo = this.processMethodDeclaration(member);
          if (methodInfo) {
            classNode.functions.push(methodInfo);
          }
          break;
        case ts.SyntaxKind.Constructor:
          const constructorInfo = this.processConstructor(member);
          if (constructorInfo) {
            classNode.functions.push(constructorInfo);
          }
          break;
        case ts.SyntaxKind.GetAccessor:
          const getterInfo = this.processAccessor(member, "getter");
          if (getterInfo) {
            classNode.functions.push(getterInfo);
          }
          break;
        case ts.SyntaxKind.SetAccessor:
          const setterInfo = this.processAccessor(member, "setter");
          if (setterInfo) {
            classNode.functions.push(setterInfo);
          }
          break;
      }
    });

    parent.children.push(classNode);
  }

  processInterface(interfaceDecl, parent) {
    const interfaceName = interfaceDecl.name.text;
    const interfaceNode = {
      name: interfaceName,
      type: "interface",
      functions: [],
      children: [],
    };

    // Process interface methods
    interfaceDecl.members.forEach((member) => {
      if (
        ts.isMethodSignature(member) ||
        ts.isCallSignatureDeclaration(member)
      ) {
        const methodInfo = this.processMethodSignature(member);
        if (methodInfo) {
          interfaceNode.functions.push(methodInfo);
        }
      }
    });

    parent.children.push(interfaceNode);
  }

  processNamespace(namespaceDecl, parent) {
    const namespaceName = namespaceDecl.name.text;
    const namespaceNode = {
      name: namespaceName,
      type: "namespace",
      functions: [],
      children: [],
    };

    if (namespaceDecl.body && ts.isModuleBlock(namespaceDecl.body)) {
      namespaceDecl.body.statements.forEach((statement) => {
        this.visitNode(statement, namespaceNode);
      });
    }

    parent.children.push(namespaceNode);
  }

  processFunctionDeclaration(funcDecl) {
    if (!funcDecl.name) return null;

    return {
      name: funcDecl.name.text,
      signature: this.getFunctionSignature(funcDecl),
      returnType: this.getReturnType(funcDecl),
      parameters: this.getParameters(funcDecl.parameters),
      isAsync: this.hasAsyncModifier(funcDecl),
      isExported: this.hasExportModifier(funcDecl),
      kind: "function",
    };
  }

  processMethodDeclaration(methodDecl) {
    const name = this.getPropertyName(methodDecl.name);
    if (!name) return null;

    return {
      name,
      signature: this.getFunctionSignature(methodDecl),
      returnType: this.getReturnType(methodDecl),
      parameters: this.getParameters(methodDecl.parameters),
      isAsync: this.hasAsyncModifier(methodDecl),
      isExported: false,
      kind: "method",
    };
  }

  processConstructor(constructorDecl) {
    return {
      name: "constructor",
      signature: this.getFunctionSignature(constructorDecl),
      returnType: "void",
      parameters: this.getParameters(constructorDecl.parameters),
      isAsync: false,
      isExported: false,
      kind: "constructor",
    };
  }

  processAccessor(accessor, kind) {
    const name = this.getPropertyName(accessor.name);
    if (!name) return null;

    return {
      name,
      signature: this.getFunctionSignature(accessor),
      returnType: kind === "getter" ? this.getReturnType(accessor) : "void",
      parameters: this.getParameters(accessor.parameters),
      isAsync: false,
      isExported: false,
      kind,
    };
  }

  processMethodSignature(methodSig) {
    let name;

    if (ts.isCallSignatureDeclaration(methodSig)) {
      name = "()"; // Call signature
    } else {
      name = this.getPropertyName(methodSig.name) || "";
    }

    return {
      name,
      signature: this.getFunctionSignature(methodSig),
      returnType: this.getReturnType(methodSig),
      parameters: this.getParameters(methodSig.parameters),
      isAsync: false,
      isExported: false,
      kind: "method",
    };
  }

  processVariableStatement(varStmt, parent) {
    varStmt.declarationList.declarations.forEach((decl) => {
      if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
        const name = ts.isIdentifier(decl.name)
          ? decl.name.text
          : "<anonymous>";
        const arrowFuncInfo = {
          name,
          signature: this.getFunctionSignature(decl.initializer),
          returnType: this.getReturnType(decl.initializer),
          parameters: this.getParameters(decl.initializer.parameters),
          isAsync: this.hasAsyncModifier(decl.initializer),
          isExported: this.hasExportModifier(varStmt),
          kind: "arrow",
        };
        parent.functions.push(arrowFuncInfo);
      }
    });
  }

  getFunctionSignature(node) {
    const sourceFile = node.getSourceFile();
    return node.getText(sourceFile);
  }

  getReturnType(node) {
    if (node.type) {
      return node.type.getText();
    }

    // Try to infer return type using type checker
    const signature = this.checker.getSignatureFromDeclaration(node);
    if (signature) {
      const returnType = this.checker.getReturnTypeOfSignature(signature);
      return this.checker.typeToString(returnType);
    }

    return "any";
  }

  getParameters(parameters) {
    if (!parameters) return [];

    return Array.from(parameters).map((param) => ({
      name: param.name.getText(),
      type: param.type ? param.type.getText() : "any",
      optional: !!param.questionToken,
    }));
  }

  getPropertyName(name) {
    if (
      ts.isIdentifier(name) ||
      ts.isStringLiteral(name) ||
      ts.isNumericLiteral(name)
    ) {
      return name.text;
    }
    if (ts.isComputedPropertyName(name)) {
      return `[${name.expression.getText()}]`;
    }
    return null;
  }

  hasAsyncModifier(node) {
    return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Async);
  }

  hasExportModifier(node) {
    return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export);
  }

  printTree(nodes, indent = "") {
    let result = "";

    for (const node of nodes) {
      result += `${indent}${this.getNodeIcon(node.type)} ${node.name}\n`;

      // Print functions
      for (const func of node.functions) {
        const asyncPrefix = func.isAsync ? "async " : "";
        const exportPrefix = func.isExported ? "export " : "";
        const kindIcon = this.getFunctionIcon(func.kind);
        result += `${indent}  ${kindIcon} ${exportPrefix}${asyncPrefix}${func.name}(${func.parameters
          .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
          .join(", ")}): ${func.returnType}\n`;
      }

      // Print children recursively
      if (node.children.length > 0) {
        result += this.printTree(node.children, indent + "  ");
      }
    }

    return result;
  }

  getNodeIcon(type) {
    const icons = {
      file: "📁",
      class: "🏛️",
      interface: "📋",
      namespace: "📦",
      function: "⚡",
    };
    return icons[type] || "📄";
  }

  getFunctionIcon(kind) {
    const icons = {
      function: "⚡",
      method: "🔧",
      arrow: "➡️",
      constructor: "🏗️",
      getter: "📤",
      setter: "📥",
    };
    return icons[kind] || "⚡";
  }
}

// Example usage function
function generateSourceCodeTree(filePaths) {
  const generator = new SourceCodeTreeGenerator(filePaths);
  const tree = generator.generateTree();

  console.log("Source Code Tree:");
  console.log("=".repeat(50));
  console.log(generator.printTree(tree));
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node tree.js <file1> [file2] [file3] ...");
    console.log("Example: node tree.js src/app.ts src/utils.js");
    process.exit(1);
  }

  // Filter existing files
  const filePaths = args.filter((arg) => fs.existsSync(arg));

  if (filePaths.length === 0) {
    console.error("No valid files found.");
    process.exit(1);
  }

  generateSourceCodeTree(filePaths);
}

export { SourceCodeTreeGenerator, generateSourceCodeTree };
