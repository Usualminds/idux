/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/IDuxFE/idux/blob/main/LICENSE
 */

import type { BackTopComponent } from './src/types'

import BackTop from './src/BackTop.vue'

const IxBackTop = BackTop as unknown as BackTopComponent

export { IxBackTop }

export type { BackTopInstance, BackTopPublicProps as BackTopProps } from './src/types'
