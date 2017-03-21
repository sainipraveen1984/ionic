import { ElementRef, EventEmitter, Input, Output, Renderer } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { NgControl } from '@angular/forms';

import { isPresent, isArray, isTrueProperty, assert } from './util';
import { Ion } from '../components/ion';
import { Config } from '../config/config';
import { Item } from '../components/item/item';
import { Form } from './form';
import { TimeoutDebouncer } from './debouncer';


export interface CommonInput<T> extends ControlValueAccessor {

  id: string;
  disabled: boolean;
  value: T;

  ionFocus: EventEmitter<CommonInput<T>>;
  ionChange: EventEmitter<BaseInput<T>>;
  ionBlur: EventEmitter<BaseInput<T>>;

  initFocus(): void;
  isFocus(): boolean;

  _inputNormalize(val: any): T;
  _inputShouldChange(val: T): boolean;
  _inputUpdated(): void;
}

export class BaseInput<T> extends Ion implements CommonInput<T> {

  _value: T = null;
  _onChanged: Function;
  _onTouched: Function;
  _isFocus: boolean = false;
  _labelId: string;
  _disabled: boolean = false;
  _debouncer: TimeoutDebouncer;
  _init: boolean = false;
  id: string;

  /**
   * @output {Range} Emitted when the range selector drag starts.
   */
  @Output() ionFocus: EventEmitter<BaseInput<T>> = new EventEmitter<BaseInput<T>>();

  /**
   * @output {Range} Emitted when the range value changes.
   */
  @Output() ionChange: EventEmitter<BaseInput<T>> = new EventEmitter<BaseInput<T>>();

  /**
   * @output {Range} Emitted when the range selector drag ends.
   */
  @Output() ionBlur: EventEmitter<BaseInput<T>> = new EventEmitter<BaseInput<T>>();

  /**
   * @input {boolean} If true, the user cannot interact with this element.
   */
  @Input()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(val: boolean) {
    this.setDisabledState(val);
  }


  constructor(
    config: Config,
    elementRef: ElementRef,
    renderer: Renderer,
    name: string,
    public _form: Form,
    public _item: Item,
    ngControl: NgControl
  ) {
    super(config, elementRef, renderer, name);
    _form && _form.register(this);

    if (_item) {
      this.id = name + '-' + _item.registerInput(name);
      this._labelId = 'lbl-' + _item.id;
      this._item.setElementClass('item-' + name, true);
    }

    // If the user passed a ngControl we need to set the valueAccessor
    if (ngControl) {
      ngControl.valueAccessor = this;
    }
  }

  get value(): T {
    return this._value;
  }
  set value(val: T) {
    if (this._writeValue(val)) {
      this.onChange();
    }
  }

  // 1. Updates the value
  // 2. Calls _inputUpdated()
  // 3. Dispatch onChange events
  setValue(val: T) {
    this.value = val;
  }

  /**
   * @hidden
   */
  setDisabledState(isDisabled: boolean) {
    this._disabled = isTrueProperty(isDisabled);
    this._item && this._item.setElementClass('item-select-disabled', isDisabled);
  }

  /**
   * @hidden
   */
  writeValue(val: any) {
    this._writeValue(val);
  }

  _writeValue(val: any): boolean {
    const normalized = this._inputNormalize(val);
    const shouldUpdate = this._inputShouldChange(normalized);
    if (shouldUpdate) {
      console.debug('BaseInput: value has changed:', val);
      this._value = normalized;
      this._inputCheckHasValue(normalized);
      this._inputUpdated();
      if (this._init) {
        this.ionChange.emit(this);
      }
      return true;
    }
    return false;
  }

  /**
   * @hidden
   */
  registerOnChange(fn: Function) {
    this._onChanged = fn;
  }

  /**
   * @hidden
   */
  registerOnTouched(fn: any) {
    this._onTouched = fn;
  }

  /**
   * @hidden
   */
  _initialize() {
    if (this._init) {
      assert(false, 'input was already initilized');
      return;
    }
    this._init = true;
  }

  /**
   * @hidden
   */
  _setFocus() {
    if (this._isFocus) {
      return;
    }
    this._isFocus = true;
    this.ionFocus.emit(this);
    this._inputUpdated();
  }

  /**
   * @hidden
   */
  _setBlur() {
    if (!this._isFocus) {
      return;
    }
    this._isFocus = false;
    this.ionBlur.emit(this);
    this._inputUpdated();
  }

  /**
   * @hidden
   */
  private onChange() {
    this._onChanged && this._onChanged(this._value);
    this._onTouched && this._onTouched();
  }

  /**
   * @hidden
   */
  isFocus(): boolean {
    return this._isFocus;
  }

  /**
   * @hidden
   */
  ngOnDestroy() {
    this._form && this._form.deregister(this);
    this._init = false;
  }

  /**
   * @hidden
   */
  ngAfterViewInit() {
    this._initialize();
  }

  /**
   * @hidden
   */
  _inputCheckHasValue(val: T) {
    if (!this._item) {
      return;
    }
    let hasValue: boolean;
    if (isArray(val)) {
      hasValue = val.length > 0;
    } else {
      hasValue = isPresent(val);
    }
    this._item.setElementClass('input-has-value', hasValue);
  }

  /**
   * @hidden
   */
  initFocus() {}

  /**
   * @hidden
   */
  _inputNormalize(val: any): T {
    return val;
  }

  /**
   * @hidden
   */
  _inputShouldChange(val: T): boolean {
    return (typeof val !== 'undefined') && this._value !== val;
  }

  /**
   * @hidden
   */
  _inputUpdated() {}
}