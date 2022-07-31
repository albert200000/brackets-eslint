import { CodeInspectionReport, CodeInspectionResult, CodeInspectionResultType } from '../types';

const EXTENSION_NAME = 'brackets-eslint-albert';
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec
const defaultCwd = process.cwd();
const ESLINT_SEVERITY_ERROR = "Error";
const ESLINT_SEVERITY_WARNING = "Warning";
const BRACKETS_TYPE_ERROR = 'problem_type_error';
const BRACKETS_TYPE_WARNING = 'problem_type_warning';
const BRACKETS_TYPE_META = 'problem_type_meta';

let currentProjectRoot: string | null = null;
let erroredLastTime: boolean = true;
let eslintPath: string = 'eslint';

const log = {
  info: (...args: any[]) => console.log('[' + EXTENSION_NAME + ']', ...args),
  warn: (...args: any[]) => console.warn('[' + EXTENSION_NAME + ']', ...args),
  error: (...args: any[]) => console.error('[' + EXTENSION_NAME + ']', ...args)
};

function uniq<T>(arr: T[]): T[] {
  return arr.reduce((result: T[], item: T) => {
    if (result.indexOf(item) === -1) {
      result.push(item);
    }
    return result;
  }, []);
}

function normalizeDir(dirPath: string) {
  if (dirPath.match(/(\\|\/)$/)) {
    dirPath = dirPath.slice(0, -1);
  }
  return process.platform === 'win32' ? dirPath.replace(/\//g, '\\') : dirPath;
}

function nodeModulesInDir(dirPath: string) {
  return path.resolve(normalizeDir(dirPath), 'node_modules');
}

export function setProjectRoot(projectRoot: string | null, prevProjectRoot: string | null) {
  // refresh when called without arguments
  if (!projectRoot) { projectRoot = currentProjectRoot; }

  if (projectRoot) {
    eslintPath = projectRoot + 'node_modules/.bin/eslint';
    try {
      if (fs.statSync(eslintPath).isDirectory()) {
        // no action required
      } else {
        throw new Error('not found');
      }
    } catch (ignoreErr) {
      // Use default
    }
  }

  // make sure plugins are loadable from current project directory
  let nodePaths = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [];

  // remove previous from NODE_PATH
  if (prevProjectRoot) {
    let io = nodePaths.indexOf(nodeModulesInDir(prevProjectRoot));
    if (io !== -1) {
      nodePaths.splice(io, 1);
    }
  }

  // add current to NODE_PATH
  if (projectRoot) {
    nodePaths = [nodeModulesInDir(projectRoot)].concat(nodePaths);
    process.chdir(normalizeDir(projectRoot));
  } else {
    process.chdir(defaultCwd);
  }

  nodePaths = uniq(nodePaths);
  process.env.NODE_PATH = nodePaths.join(path.delimiter);
  require('module').Module._initPaths();
}

function mapEslintMessage(result: any): CodeInspectionResult {
  const offset = 1;

  let message: string;
  let type: CodeInspectionResultType;
  switch (result.severity) {
    case ESLINT_SEVERITY_ERROR:
      message = 'ERROR: ';
      type = BRACKETS_TYPE_ERROR as CodeInspectionResultType;
      break;
    case ESLINT_SEVERITY_WARNING:
      message = 'WARNING: ';
      type = BRACKETS_TYPE_WARNING as CodeInspectionResultType;
      break;
    default:
      message = 'UNKNOWN: ';
      type = BRACKETS_TYPE_META as CodeInspectionResultType;
  }

  message += result.message;

  return {
    type,
    message,
    pos: {
      line: result.line - offset,
      ch: result.column - offset
    }
  };
}

function createCodeInspectionReport(eslintReport: string): CodeInspectionReport {
  const messages : any[] = [];
  const parseRegex = /(.+):\sline\s(\d+),\scol\s(\d+),\s(.+)\s-\s(.+)\s.+/g
  let match = parseRegex.exec(eslintReport);

  while (match !== null) {
    messages.push({
      line: +match[2],
      column: +match[3],
      severity: match[4],
      message: match[5]
    });

    match = parseRegex.exec(eslintReport);
  }

  return {
    errors: messages.map((x: any) => mapEslintMessage(x))
  };
}

//function createUserError(message: string): CodeInspectionReport {
//  erroredLastTime = true;
//  return {
//    errors: [{
//      type: 'problem_type_error',
//      message,
//      pos: { line: 0, ch: 0 }
//    }]
//  };
//}

export function lintFile(
  projectRoot: string, fullPath: string, nodePath: string,
  callback: (err: Error | null, res?: CodeInspectionReport) => void
) {
  if (erroredLastTime || projectRoot !== currentProjectRoot) {
    try {
      setProjectRoot(projectRoot, currentProjectRoot);
      currentProjectRoot = projectRoot;
      erroredLastTime = false;
    } catch (err) {
      log.error(`Error thrown in setProjectRoot: ${err.stack}`);
    }
  }

  exec(`${nodePath} ${eslintPath} --no-color --format compact ${fullPath}`, function (e, stdout) {
    callback(null, createCodeInspectionReport(stdout));
  });
}

export function fixFile(
  projectRoot: string, fullPath: string, nodePath: string, callback: (err: Error | null, res?: any) => void
) {
  exec(`${nodePath} ${eslintPath} --fix ${fullPath}`, function () {
    callback(null);
  });
}
