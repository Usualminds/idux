/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/IDuxFE/idux/blob/main/LICENSE
 */

import type { FormItemProps, FormLabelAlign } from './types'
import type { AbstractControl, ValidateErrors, ValidateStatus } from '@idux/cdk/forms'
import type { ColProps } from '@idux/components/grid'
import type { Locale } from '@idux/components/i18n'
import type { ComputedRef, Ref, Slots, WatchStopHandle } from 'vue'

import { computed, defineComponent, inject, provide, shallowRef, watch, watchEffect } from 'vue'

import { isFunction, isNumber, isString } from 'lodash-es'

import { useValueControl } from '@idux/cdk/forms'
import { VKey } from '@idux/cdk/utils'
import { IxCol, IxRow } from '@idux/components/grid'
import { getLocale } from '@idux/components/i18n'
import { IxIcon } from '@idux/components/icon'
import { IxTooltip } from '@idux/components/tooltip'

import { FORM_ITEM_TOKEN, formToken } from './token'
import { formItemProps } from './types'

export default defineComponent({
  name: 'IxFormItem',
  props: formItemProps,
  setup(props, { slots }) {
    const { status, statusIcon, message } = useControlStatus(props)

    const { colonless, controlCol, labelAlign, labelCol, hasFeedback: formHasFeedback } = inject(formToken, null) || {}

    const labelColConfig = computed(() => normalizeColConfig(props.labelCol ?? labelCol?.value))
    const controlColConfig = computed(() => normalizeColConfig(props.controlCol ?? controlCol?.value))
    const hasFeedback = computed(() => props.hasFeedback ?? !!formHasFeedback?.value)

    const classes = useClasses(hasFeedback, status, message)
    const labelClasses = useLabelClasses(props, colonless, labelAlign)

    return () => {
      return (
        <IxRow class={classes.value}>
          {renderLabel(props, slots, labelClasses, labelColConfig)}
          {renderControl(props, slots, controlColConfig, hasFeedback, statusIcon, message)}
        </IxRow>
      )
    }
  },
})

function renderLabel(
  props: FormItemProps,
  slots: Slots,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classes: ComputedRef<Record<string, any>>,
  labelColConfig: ComputedRef<ColProps | undefined>,
) {
  const { label, labelFor, labelTooltip } = props
  const { label: labelSlot, labelTooltip: labelTooltipSlot } = slots
  if (!(label || labelSlot || labelTooltip || labelTooltipSlot)) {
    return undefined
  }
  const tooltipNode = labelTooltipSlot ? (
    labelTooltipSlot()
  ) : labelTooltip ? (
    <IxTooltip title={labelTooltip}>
      <IxIcon name="question-circle" />
    </IxTooltip>
  ) : undefined
  const tooltipWrapper = tooltipNode ? <span class="ix-form-item-label-tooltip">{tooltipNode}</span> : undefined
  return (
    <IxCol class={classes.value} {...labelColConfig.value}>
      <label for={labelFor}>
        {labelSlot?.() ?? label}
        {tooltipWrapper}
      </label>
    </IxCol>
  )
}

function renderControl(
  props: FormItemProps,
  slots: Slots,
  controlColConfig: ComputedRef<ColProps | undefined>,
  hasFeedback: ComputedRef<boolean>,
  statusIcon: ComputedRef<string | undefined>,
  message: ComputedRef<string | undefined>,
) {
  const { extra } = props
  const { extra: extraSlot } = slots
  const statusNode =
    hasFeedback.value && statusIcon.value ? (
      <span class="ix-form-item-status-icon">
        <IxIcon name={statusIcon.value} />
      </span>
    ) : undefined
  const messageNode = message.value ? <div class="ix-form-item-message">{message.value}</div> : undefined
  const extraNode = extraSlot?.() ?? extra
  const extraWrapper = extraNode ? <div class="ix-form-item-extra">{extraNode}</div> : undefined
  return (
    <IxCol class="ix-form-item-control" {...controlColConfig.value}>
      <div class="ix-form-item-control-input">
        <div class="ix-form-item-control-input-content">{slots.default?.()}</div>
        {statusNode}
      </div>
      {messageNode}
      {extraWrapper}
    </IxCol>
  )
}

function useClasses(
  hasFeedback: ComputedRef<boolean>,
  status: ComputedRef<ValidateStatus | undefined>,
  message: ComputedRef<string | undefined>,
) {
  return computed(() => {
    const currStatus = status.value
    return {
      'ix-form-item': true,
      'ix-form-item-has-feedback': hasFeedback.value && currStatus,
      'ix-form-item-has-message': message.value,
      [`ix-form-item-${currStatus}`]: currStatus,
    }
  })
}

function useLabelClasses(
  props: FormItemProps,
  colonlessRef: ComputedRef<boolean> | undefined,
  labelAlignRef: ComputedRef<FormLabelAlign> | undefined,
) {
  return computed(() => {
    const { colonless = colonlessRef?.value, labelAlign = labelAlignRef?.value, required } = props
    return {
      'ix-form-item-label': true,
      'ix-form-item-label-colonless': colonless,
      'ix-form-item-label-required': required,
      'ix-form-item-label-start': labelAlign === 'start',
    }
  })
}

function normalizeColConfig(col: string | number | ColProps | undefined) {
  return isNumber(col) || isString(col) ? { span: col } : col
}

function useControl() {
  const firstChildControl = shallowRef<AbstractControl>()
  let firstChildKey: VKey | undefined
  let firstChildWatchStop: WatchStopHandle | undefined

  const registerControl = (key: VKey, control: Ref<AbstractControl | undefined>) => {
    if (!firstChildWatchStop) {
      firstChildKey = key
      firstChildWatchStop = watchEffect(() => (firstChildControl.value = control.value))
    }
  }
  const unregisterControl = (key: VKey) => {
    if (key === firstChildKey) {
      if (firstChildWatchStop) {
        firstChildWatchStop()
        firstChildWatchStop = undefined
      }
      firstChildControl.value = undefined
    }
  }

  provide(FORM_ITEM_TOKEN, { registerControl, unregisterControl })

  const selfControl = useValueControl()

  const control = shallowRef<AbstractControl>()

  watch(
    [selfControl, firstChildControl],
    ([self, child]) => {
      const target = self ?? child
      if (control.value !== target) {
        control.value = target
      }
    },
    { immediate: true },
  )

  return control
}

const iconTypeMap = {
  invalid: 'close-circle-filled',
  validating: 'loading',
  valid: 'check-circle-filled',
} as const

function useControlStatus(props: FormItemProps) {
  const control = useControl()

  const status = useStatus(props, control)
  const message = useMessage(props, control, status)
  const statusIcon = computed(() => {
    const currStatus = status.value
    return currStatus ? iconTypeMap[currStatus] : undefined
  })

  return { status, statusIcon, message }
}

function useStatus(props: FormItemProps, control: Ref<AbstractControl | undefined>) {
  return computed(() => {
    if (props.status) {
      return props.status
    }
    const currControl = control.value
    if (!currControl) {
      return undefined
    }
    const { trigger, dirty, blurred } = currControl
    if ((trigger === 'change' && dirty.value) || (trigger === 'blur' && blurred.value)) {
      return currControl.status.value
    }
    return undefined
  })
}

function useMessage(
  props: FormItemProps,
  control: Ref<AbstractControl | undefined>,
  status: ComputedRef<ValidateStatus | undefined>,
) {
  const locale = getLocale()
  const messages = computed(() => {
    const message = props.message
    return isString(message) || isFunction(message) ? { invalid: message } : message || {}
  })
  return computed(() => {
    const currStatus = status.value
    if (!currStatus) {
      return undefined
    }

    const currMessage = messages.value[currStatus]
    if (currMessage) {
      return isString(currMessage) ? currMessage : currMessage(control.value!)
    }

    return getMessageByError(control.value?.errors.value, locale)
  })
}

function getMessageByError(error: ValidateErrors | undefined, locale: ComputedRef<Locale>) {
  if (!error) {
    return undefined
  }

  for (const key in error) {
    const { message, ...rest } = error[key]
    if (message) {
      if (isString(message)) {
        return message
      }

      if (isFunction(message)) {
        return message(rest)
      }

      const currMessage = message[locale.value.type]
      if (isString(currMessage)) {
        return currMessage
      }
      return currMessage(rest)
    }
  }

  return undefined
}
