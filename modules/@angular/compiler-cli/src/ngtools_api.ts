/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * This is a private API for the ngtools toolkit.
 *
 * This API should be stable for NG 2. It can be removed in NG 4..., but should be replaced by
 * something else.
 */

import {AotCompilerHost, StaticReflector} from '@angular/compiler';
import {AngularCompilerOptions, NgcCliOptions} from '@angular/tsc-wrapped';
import * as ts from 'typescript';

import {CodeGenerator} from './codegen';
import {CompilerHost, CompilerHostContext, ModuleResolutionHostAdapter} from './compiler_host';
import {listLazyRoutesOfModule} from './ngtools_impl';
import {PathMappedCompilerHost} from './path_mapped_compiler_host';


export interface NgTools_InternalApi_NG2_CodeGen_Options {
  basePath: string;
  compilerOptions: ts.CompilerOptions;
  program: ts.Program;
  host: ts.CompilerHost;

  angularCompilerOptions: AngularCompilerOptions;

  // i18n options.
  i18nFormat: string;
  i18nFile: string;
  locale: string;

  readResource: (fileName: string) => Promise<string>;

  // Every new property under this line should be optional.
}

export interface NgTools_InternalApi_NG2_ListLazyRoutes_Options {
  program: ts.Program;
  host: ts.CompilerHost;
  angularCompilerOptions: AngularCompilerOptions;
  entryModule: string;

  // Every new property under this line should be optional.
}


export interface NgTools_InternalApi_NG_2_LazyRouteMap { [route: string]: string; }


/**
 * A ModuleResolutionHostAdapter that overrides the readResource() method with the one
 * passed in the interface.
 */
class CustomLoaderModuleResolutionHostAdapter extends ModuleResolutionHostAdapter {
  constructor(
      private _readResource: (path: string) => Promise<string>, host: ts.ModuleResolutionHost) {
    super(host);
  }

  readResource(path: string) { return this._readResource(path); }
}


/**
 * @internal
 * @private
 */
export class NgTools_InternalApi_NG_2 {
  /**
   * @internal
   * @private
   */
  static codeGen(options: NgTools_InternalApi_NG2_CodeGen_Options): Promise<void> {
    const hostContext: CompilerHostContext =
        new CustomLoaderModuleResolutionHostAdapter(options.readResource, options.host);
    const cliOptions: NgcCliOptions = {
      i18nFormat: options.i18nFormat,
      i18nFile: options.i18nFile,
      locale: options.locale,
      basePath: options.basePath
    };

    // Create the Code Generator.
    const codeGenerator = CodeGenerator.create(
        options.angularCompilerOptions, cliOptions, options.program, options.host, hostContext);

    return codeGenerator.codegen();
  }


  /**
   * @internal
   * @private
   */
  static listLazyRoutes(options: NgTools_InternalApi_NG2_ListLazyRoutes_Options):
      NgTools_InternalApi_NG_2_LazyRouteMap {
    const angularCompilerOptions = options.angularCompilerOptions;
    const program = options.program;

    const moduleResolutionHost = new ModuleResolutionHostAdapter(options.host);
    const usePathMapping =
        !!angularCompilerOptions.rootDirs && angularCompilerOptions.rootDirs.length > 0;
    const ngCompilerHost: AotCompilerHost = usePathMapping ?
        new PathMappedCompilerHost(program, angularCompilerOptions, moduleResolutionHost) :
        new CompilerHost(program, angularCompilerOptions, moduleResolutionHost);

    const staticReflector = new StaticReflector(ngCompilerHost);
    const routeMap = listLazyRoutesOfModule(options.entryModule, ngCompilerHost, staticReflector);

    return Object.keys(routeMap).reduce(
        (acc: NgTools_InternalApi_NG_2_LazyRouteMap, route: string) => {
          acc[route] = routeMap[route].absoluteFilePath;
          return acc;
        },
        {});
  }
}
