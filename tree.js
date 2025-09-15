/*
Generate and export tree to tree.md:
node tree.js --export --simple

With ignore folders and export:
node tree.js --export --ignore client/src/components/ui

Specific directories with export:
node tree.js client server --export
*/
import ts from "typescript";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SourceCodeTreeGenerator {
  constructor(filePaths, compilerOptions = {}, directoryTree = null) {
    this.filePaths = filePaths;
    this.directoryTree = directoryTree;
    this.analysisTree = null; // Will store the analyzed tree
    this.program = ts.createProgram(filePaths, {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      allowJs: true, // Allow JavaScript files
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

    this.analysisTree = roots; // Store for directory tree printing
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
        result += `${indent}│  ${kindIcon} ${exportPrefix}${asyncPrefix}${func.name}(${func.parameters
          .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
          .join(", ")}): ${func.returnType}\n`;
      }

      // Print children recursively
      if (node.children.length > 0) {
        result += this.printTree(node.children, indent + "│  ");
      }
    }

    return result;
  }

  // New method to print directory tree structure
  printDirectoryTree(tree, indent = "", isLast = true, simpleMode = false) {
    let result = "";
    const entries = Object.entries(tree);

    entries.forEach(([name, item], index) => {
      const isLastEntry = index === entries.length - 1;
      const prefix = isLast ? (isLastEntry ? "└── " : "├── ") : (isLastEntry ? "└── " : "├── ");
      const nextIndent = indent + (isLast ? (isLastEntry ? "    " : "│   ") : (isLastEntry ? "    " : "│   "));

      if (item.type === 'directory') {
        result += `${indent}${prefix}📁 ${name}/\n`;
        if (Object.keys(item.children).length > 0) {
          result += this.printDirectoryTree(item.children, nextIndent, isLastEntry, simpleMode);
        }
      } else if (item.type === 'file') {
        result += `${indent}${prefix}📄 ${name}\n`;
        
        // Skip detailed analysis in simple mode
        if (!simpleMode) {
          // Find the analyzed file data for this path
          const fileNode = this.findFileInTree(this.analysisTree, item.path);
          if (fileNode) {
            // Print functions for this file
            for (const func of fileNode.functions) {
              const asyncPrefix = func.isAsync ? "async " : "";
              const exportPrefix = func.isExported ? "export " : "";
              const kindIcon = this.getFunctionIcon(func.kind);
              result += `${nextIndent}${kindIcon} ${exportPrefix}${asyncPrefix}${func.name}(${func.parameters
                .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
                .join(", ")}): ${func.returnType}\n`;
            }

            // Print children (classes, interfaces, etc.)
            if (fileNode.children.length > 0) {
              result += this.printTree(fileNode.children, nextIndent);
            }
          }
        }
      }
    });

    return result;
  }

  // Helper method to find file node in analysis tree
  findFileInTree(nodes, filePath) {
    for (const node of nodes) {
      if (node.path === filePath) {
        return node;
      }
    }
    return null;
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

// Function to recursively find TypeScript and JavaScript files
function findSourceFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx'], ignoreFolders = []) {
  const files = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip common directories that don't contain source code
        const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.nyc_output'];

        // Check if this directory should be ignored based on relative path
        const relativePath = path.relative(process.cwd(), fullPath);
        const shouldIgnore = ignoreFolders.some(ignorePattern => {
          return relativePath === ignorePattern || relativePath.startsWith(ignorePattern + path.sep);
        });

        if (!skipDirs.includes(entry.name) && !shouldIgnore) {
          files.push(...findSourceFiles(fullPath, extensions, ignoreFolders));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Cannot read directory ${dir}: ${error.message}`);
  }

  return files;
}


// Example usage function - now returns the tree data
function generateSourceCodeTree(filePaths) {
  const generator = new SourceCodeTreeGenerator(filePaths);
  const tree = generator.generateTree();
  const treeOutput = generator.printTree(tree);

  console.log("Source Code Tree:");
  console.log("=".repeat(50));
  console.log(treeOutput);

  return {
    tree,
    output: treeOutput
  };
}

// Enhanced function that shows directory structure with source analysis
function generateSourceCodeTreeWithDirectory(filePaths, directoryTree, exportToFile = false, simpleMode = false) {
  const generator = new SourceCodeTreeGenerator(filePaths, {}, directoryTree);
  
  // Skip analysis entirely in simple mode for better performance
  let tree = null;
  if (!simpleMode) {
    tree = generator.generateTree();
  }
  
  const treeOutput = generator.printDirectoryTree(directoryTree, "", true, simpleMode);

  const title = simpleMode ? "Directory Tree Structure:" : "Source Code Tree with Directory Structure:";
  console.log(title);
  console.log("=".repeat(60));
  console.log(treeOutput);

  // Export to file if requested
  if (exportToFile) {
    const title = simpleMode ? "Directory Tree" : "Source Code Tree";
    const markdownContent = `# ${title}

Generated on: ${new Date().toISOString()}
${simpleMode ? "\n*Simple mode: Directory structure only*" : ""}

\`\`\`
${treeOutput}
\`\`\`
`;
    
    try {
      fs.writeFileSync('tree.md', markdownContent, 'utf8');
      console.log("\n✅ Tree exported to tree.md");
    } catch (error) {
      console.error("\n❌ Failed to export tree:", error.message);
    }
  }

  return {
    tree,
    directoryTree,
    output: treeOutput
  };
}

// Function to build directory tree structure with source files
function buildDirectoryTree(dir, extensions = ['.ts', '.tsx', '.js', '.jsx'], rootDir = dir, ignoreFolders = []) {
  const tree = {};

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      // Skip the tree.js file itself
      if (entry.name === 'tree.js' && dir === rootDir) {
        continue;
      }

      if (entry.isDirectory()) {
        // Skip common directories that don't contain source code
        const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.nyc_output'];

        // Check if this directory should be ignored based on relative path
        const shouldIgnore = ignoreFolders.some(ignorePattern => {
          return relativePath === ignorePattern || relativePath.startsWith(ignorePattern + path.sep);
        });

        if (!skipDirs.includes(entry.name) && !shouldIgnore) {
          const subtree = buildDirectoryTree(fullPath, extensions, rootDir, ignoreFolders);
          if (Object.keys(subtree).length > 0) {
            tree[entry.name] = { type: 'directory', children: subtree };
          }
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          tree[entry.name] = { type: 'file', path: fullPath };
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Cannot read directory ${dir}: ${error.message}`);
  }

  return tree;
}

// Function to extract all file paths from directory tree
function extractFilePaths(tree) {
  const files = [];

  function traverse(node, basePath = '') {
    for (const [name, item] of Object.entries(node)) {
      if (item.type === 'file') {
        files.push(item.path);
      } else if (item.type === 'directory') {
        traverse(item.children, path.join(basePath, name));
      }
    }
  }

  traverse(tree);
  return files;
}

// CLI interface - Fixed detection
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  const args = process.argv.slice(2);
  let ignoreFolders = [];
  let exportToFile = false;
  let simpleMode = false;

  // Check for --simple flag
  const simpleIndex = args.indexOf('--simple');
  if (simpleIndex !== -1) {
    simpleMode = true;
    args.splice(simpleIndex, 1);
  }

  // Check for --export flag
  const exportIndex = args.indexOf('--export');
  if (exportIndex !== -1) {
    exportToFile = true;
    args.splice(exportIndex, 1);
  }

  // Check for --ignore flag
  const ignoreIndex = args.indexOf('--ignore');
  if (ignoreIndex !== -1) {
    ignoreFolders = args.slice(ignoreIndex + 1).filter(arg => !arg.startsWith('--'));
    args.splice(ignoreIndex, ignoreFolders.length + 1);
  }

  if (args.length === 0) {
    // If no arguments, scan the current directory
    if (simpleMode) {
      console.log("Simple mode: Generating directory tree structure only...");
    } else {
      console.log("No files specified. Scanning current directory for TypeScript/JavaScript files...");
    }
    if (exportToFile) {
      console.log("Export flag detected. Tree will be saved to tree.md");
    }
    const currentDir = process.cwd();
    const directoryTree = buildDirectoryTree(currentDir, ['.ts', '.tsx', '.js', '.jsx'], currentDir, ignoreFolders);
    const foundFiles = extractFilePaths(directoryTree);

    if (foundFiles.length === 0 && !simpleMode) {
      console.error("No TypeScript or JavaScript files found in current directory.");
      process.exit(1);
    }

    if (!simpleMode) {
      console.log(`Found ${foundFiles.length} source files to analyze.\n`);
    }
    generateSourceCodeTreeWithDirectory(foundFiles, directoryTree, exportToFile, simpleMode);
  } else {
    // Process specified files/directories
    let filePaths = [];
    let directoryTree = {};

    for (const arg of args) {
      if (!fs.existsSync(arg)) {
        console.warn(`Warning: ${arg} does not exist, skipping.`);
        continue;
      }

      const stat = fs.statSync(arg);
      if (stat.isDirectory()) {
        // If directory, build tree and find all source files in it
        const argTree = buildDirectoryTree(arg, ['.ts', '.tsx', '.js', '.jsx'], arg, ignoreFolders);
        const dirFiles = extractFilePaths(argTree);
        filePaths.push(...dirFiles);
        directoryTree[path.basename(arg)] = { type: 'directory', children: argTree };
      } else if (stat.isFile()) {
        // If file, add it directly
        filePaths.push(arg);
        directoryTree[path.basename(arg)] = { type: 'file', path: arg };
      }
    }

    if (filePaths.length === 0 && !simpleMode) {
      console.error("No valid files found.");
      process.exit(1);
    }

    generateSourceCodeTreeWithDirectory(filePaths, directoryTree, exportToFile, simpleMode);
  }
}

export { SourceCodeTreeGenerator, generateSourceCodeTree };