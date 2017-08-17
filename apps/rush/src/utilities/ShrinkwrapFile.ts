// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as colors from 'colors';
import * as fsx from 'fs-extra';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as semver from 'semver';
import npmPackageArg = require('npm-package-arg');

import { Utilities, RushConstants } from '@microsoft/rush-lib';

interface IShrinkwrapDependencyJson {
  resolution: {
    integrity: string;
  };
  dependencies: { [dependency: string]: string };
}

interface IShrinkwrapJson {
  /** The list of resolved direct dependencies */
  dependencies: { [dependency: string]: string };
/** The description of the solved DAG */
  packages: { [dependencyVersion: string]: IShrinkwrapDependencyJson };
  /** URL of the registry */
  registry: string;
  shrinkwrapVersion: number;
  /** The list of specifiers used to resolve direct dependency versions */
  specifiers: { [dependency: string]: string };
}

/**
 * This class is a parser for NPM's shrinkwrap.yaml file format.
 */
export default class ShrinkwrapFile {
  private _shrinkwrapJson: IShrinkwrapJson;
  private _alreadyWarnedSpecs: Set<string> = new Set<string>();

  public static loadFromFile(shrinkwrapYamlFilename: string): ShrinkwrapFile | undefined {
    try {
      if (!fsx.existsSync(shrinkwrapYamlFilename)) {
        return undefined; // file does not exist
      }

      // We don't use JsonFile/jju here because shrinkwrap.json is a special NPM file format
      // and typically very large, so we want to load it the same way that NPM does.
      const parsedData: IShrinkwrapJson = yaml.safeLoad(fsx.readFileSync(shrinkwrapYamlFilename).toString());

      return new ShrinkwrapFile(parsedData);
    } catch (error) {
      throw new Error(`Error reading "${shrinkwrapYamlFilename}":` + os.EOL + `  ${error.message}`);
    }
  }

  private static tryGetValue<T>(dictionary: { [key2: string]: T }, key: string): T | undefined {
    if (dictionary.hasOwnProperty(key)) {
      return dictionary[key];
    }
    return undefined;
  }

  /**
   * Returns the list of temp projects defined in this file.
   * Example: [ '@rush-temp/project1', '@rush-temp/project2' ]
   */
  public getTempProjectNames(): ReadonlyArray<string> {
    const result: string[] = [];
    for (const key of Object.keys(this._shrinkwrapJson.dependencies)) {
      // If it starts with @rush-temp, then include it:
      if (Utilities.parseScopedPackageName(key).scope === RushConstants.rushTempNpmScope) {
        result.push(key);
      }
    }
    result.sort();  // make the result deterministic
    return result;
  }

  /**
   * Returns true if the shrinkwrap file includes a package that would satisfiying the specified
   * package name and SemVer version range.
   */
  public hasCompatibleDependency(dependencyName: string, versionRange: string): boolean {
    const dependencyVersion: string = ShrinkwrapFile.tryGetValue(this._shrinkwrapJson.dependencies, dependencyName);

    if (!dependencyVersion) {
      return false;
    }

    const result: npmPackageArg.IResult = npmPackageArg.resolve(dependencyName, versionRange);
    switch (result.type) {
      case 'version':
      case 'range':
        // If it's a SemVer pattern, then require that the shrinkwrapped version must be compatible
        return semver.satisfies(dependencyVersion, versionRange);
      default:
        // Only warn once for each spec
        if (!this._alreadyWarnedSpecs.has(result.rawSpec)) {
          this._alreadyWarnedSpecs.add(result.rawSpec);
          console.log(colors.yellow(`WARNING: Not validating ${result.type}-based specifier: "${result.rawSpec}"`));
        }
        return true;
    }
  }

  private constructor(shrinkwrapJson: IShrinkwrapJson) {
    this._shrinkwrapJson = shrinkwrapJson;

    // Normalize the data
    if (!this._shrinkwrapJson.registry) {
      this._shrinkwrapJson.registry = '';
    }
    if (!this._shrinkwrapJson.shrinkwrapVersion) {
      this._shrinkwrapJson.shrinkwrapVersion = 3; // 3 is the current version for pnpm
    }
    if (!this._shrinkwrapJson.dependencies) {
      this._shrinkwrapJson.dependencies = { };
    }
    if (!this._shrinkwrapJson.specifiers) {
      this._shrinkwrapJson.specifiers = { };
    }
    if (!this._shrinkwrapJson.packages) {
      this._shrinkwrapJson.packages = { };
    }
  }
}
