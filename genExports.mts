#!/usr/bin/env tsx
/*

Script that renders exports for Vite compatibility.
May also be useful for ES Modules package.json generation.

# Instructions

optional: Customize the TROOT to match destination paths.

1. Save as `genExports.mts`, the extension is important
1. Place on root of primevue 2.x project
2. Execute with `npx tsx genExports.mts`
3. Results will be inside PKG_JSON, in the excludes field.


# Bonus

0. Add `.js` extensions to ToastService.js and all js files in `utils`. 
0. Replace `(import .* '\.\./.*)(utils/[A-Z][A-z]*)'` with `$1$2.js'`
0. Add `.js` to all `(import .* '\.\./\S*service/)([A-Z][A-z]*)'` in src/components
0. `(import .* '\.\./\S*./)([A-Z][A-z]*)'` to `$1$2.vue'`
0. take special care with Ripple and Api
0. With Code find `(import .* '\./)([A-Z][A-z]*)'` and replace it with `$1$2.vue'`
0. build the css and export that too
0. run `npx gulp build-resources`
0. add `"./resources/*": "./dist/resources/*",` to exports
0. Fixup .npmignore to include dist

# Other problems
- Full calendar is not ESM
- Chart 2.7 is not ESM

*/

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

const APPEND_EXPORTS =[
  ["./config", {
    "types": "./src/components/config/PrimeVue.d.ts",
    "default": "./src/components/config/PrimeVue.vue"
  }],
  ["./resources/*", "./dist/resources/*",]
]
const PKG_JSON = 'package.json'
const CROOT = 'src/components'
const TROOT = '.' // targets will be relative to this

const forceInclude = ['nuxt/index.js']
const exclude = ['nuxt', 'config', 'common']
const componentDirsRaw = await readdir(CROOT)
const componentDirs = componentDirsRaw.filter(c => !exclude.includes(c))
const nComponentsExcluded = componentDirsRaw.length - componentDirs.length
const componentDirs2 = Array()
const componentDirs3 = Array()

const vueComponents = Array()
const jsComponents = Array()
const forcedComponents = Array()
const componentsFound = Array()

const getETPath = (file: string) => './' + relative(TROOT, file)

for (const cDir of componentDirs) {
  const files = await readdir(CROOT + '/' + cDir)
  for (const f of files) {
    const a = f.split('.')
    const baseName = a.at(-2) || ''
    if (a.at(-1) === 'vue' && baseName.toLowerCase()  === cDir) {
      const file = resolve(`${CROOT}/${cDir}/${f}`)
      componentsFound.push(cDir)
      if (files.includes(baseName + '.d.ts')) { // TS
        const tsDef = resolve(`${CROOT}/${cDir}/${baseName}.d.ts`)
        vueComponents.push({
          types: getETPath(tsDef),
          default: getETPath(file)
        })
      } else {
        vueComponents.push(getETPath(file))
      }
      break
    } else if (files.at(-1) === f) { // last one
      componentDirs2.push(cDir)
    }
  }
}

for (const jsDir of componentDirs2) {
  const files = await readdir(CROOT + '/' + jsDir)
  for (const f of files) {
    const a = f.split('.')
    const baseName = a.at(-2) || ''
    if (a.at(-1) === 'js' && baseName.toLowerCase() === jsDir) {
      const file = resolve(`${CROOT}/${jsDir}/${f}`)
      componentsFound.push(jsDir)
      if (files.includes(baseName + '.d.ts')) { // TS
        const tsDef = resolve(`${CROOT}/${jsDir}/${baseName}.d.ts`)
        jsComponents.push({
          types: getETPath(tsDef),
          default: getETPath(file)
        })
      } else {
        jsComponents.push(getETPath(file))
      }
      break
    } else if (files.at(-1) === f) { // last one
      componentDirs3.push(jsDir)
    }
  }
}

for (const fPath of forceInclude) {
  const file = resolve(`${CROOT}/${fPath}`)
  forcedComponents.push(getETPath(file))
}

// Report
const missingComponents = componentDirs3.map(m => `  "${m}"`).join('\n')
const nComponentsFound = componentsFound.length + nComponentsExcluded
console.log(`
# Component report:

  Total component roots: ${componentDirsRaw.length}
  Vue components found: ${vueComponents.length}
  Secondary component roots: ${componentDirs2.length}
  JS components found: ${jsComponents.length}
  Components excluded: ${nComponentsExcluded}
  Total Components found: ${nComponentsFound}
`)

if (nComponentsFound !== componentDirsRaw.length) {
  console.log(`# Components still missing:\n\n${missingComponents}`)
}

const exportsArr = [...vueComponents, ...jsComponents, ...forcedComponents].map(v => {
  const linkName = './' + relative(CROOT, v.default || v).split('/').at(0)
  return [linkName, v]
})
const exports = Object.fromEntries(exportsArr.concat(APPEND_EXPORTS))
const pkgRaw = await readFile(PKG_JSON, 'utf8')
const pkg = JSON.parse(pkgRaw)
pkg.exports = exports

const pkgOutput = JSON.stringify(pkg, null, 2)
writeFile(PKG_JSON, pkgOutput, 'utf8')