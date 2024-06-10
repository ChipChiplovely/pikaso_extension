import Konva from 'konva'

import { convertHtmlToText } from '../../../utils/html-to-text'

import { Board } from '../../../Board'
import { ShapeModel } from '../../ShapeModel'
import { isBrowser, isNode } from '../../../utils/detect-environment'
import { rotateAroundCenter } from '../../../utils/rotate-around-center'
import { DrawType, LabelConfig } from '../../../types'
import { TextSvgModel } from '../TextSvgModel'

export class LabelModel extends ShapeModel<Konva.Label, Konva.LabelConfig> {
  /**
   * The configurations of the label
   */
  public config: LabelConfig

  /**
   * Represents whether the label is editing (inline edit) or not
   */
  private isEditingEnabled = false

  /**
   * add more Refer Node
   */
  private referShape: TextSvgModel

  constructor(board: Board, node: Konva.Label, config: LabelConfig = {}) {
    super(board, node, config)
    this.config = config
    node.on('transform', this.transform.bind(this))
    node.on('transformend', this.transformend.bind(this))
    node.on('dblclick', this.inlineEdit.bind(this))
    node.on('rotationChange', this.rotationChange.bind(this))
    node.on('dragend', this.syncPosition.bind(this))
    node.getTag().on('fillChange', this.tagFillChange.bind(this))
    node.getText().on('fontFamilyChange', this.sync.bind(this))
    node.getText().on('fontSizeChange', this.sync.bind(this))
    node.getText().on('letterSpacingChange', this.sync.bind(this))
    node.getText().on('textChange', this.textChange.bind(this))
    this._syncAttrs()
  }

  /**
   * @inheritdoc
   */
  public get type(): string {
    return 'label'
  }

  /**
   * Returns the label is in inline editing mode or not
   */
  public get isEditing() {
    return this.isEditingEnabled
  }

  /**
   * Returns the text node of the label
   */
  public get textNode() {
    return this.node.getText() as Konva.Text
  }

  /**
   * Returns the tag node of the label
   */
  public get tagNode() {
    return this.node.getTag() as Konva.Tag
  }

  /**
   * Returns the original content of Text
   */
  public getOrgText() {
    return this.textNode.getAttr('orgText')
  }

  /**
   * Set Content to origin text
   * @param orgText
   */
  public setOrgText(orgText: string) {
    this.updateText({
      orgText: orgText
    })
    this.syncPosition()
  }

  /**
   * @inheritdoc
   * @override
   */
  public rotate(theta: number) {
    rotateAroundCenter(this.node, theta)

    this.board.events.emit('shape:rotate', {
      shapes: [this]
    })
  }

  /**
   * Updates attributes of the label's tag
   *
   * @param attributes The list of attributes
   */
  public updateTag(attributes: Partial<Konva.TagConfig>) {
    // this.board.history.create(this.board.layer, this.tagNode)
    this.tagNode.setAttrs(attributes)
  }

  /**
   * Updates attributes of the label's tag
   *
   * @param attributes The list of attributes
   */
  public updateText(attributes: Partial<Konva.TextConfig>) {
    // this.board.history.create(this.board.layer, this.textNode)
    this.textNode.setAttrs(attributes)

    this.updateTransformer()
  }

  /**
   * Controls transforming the label
   * This function rescales the text node and label node
   * to avoid from stretching that
   */
  private transform() {
    if (
      this.config.keepScale === false ||
      this.board.selection.transformer.getActiveAnchor() === 'rotater'
    ) {
      return
    }
    if (
      this.board.selection.transformer.getActiveAnchor() === 'middle-left' ||
      this.board.selection.transformer.getActiveAnchor() === 'middle-right'
    ) {
      this.textNode.setAttrs({
        width: Math.max(this.node.width() * this.node.scaleX(), 30),
        wrap: 'word'
      })
      this.node.scaleX(this.node.scaleY())
    }
  }

  /**
   * Sync fontsize after changing every thing
   * @param e
   * @private
   */
  private transformend(e: Konva.KonvaEventObject<MouseEvent>) {
    if (this.referShape && !this.referShape.isVisible) {
      this.referShape.node.setAttrs({
        scaleX: this.node.getAbsoluteScale().x,
        scaleY: this.node.getAbsoluteScale().y
      })
    }
    this.updateTransformer()
  }

  /**
   * Sync Position after changing every thing
   * @param e
   * @private
   */
  private sync(e: Konva.KonvaEventObject<MouseEvent>) {
    this._syncAttrs()
    this.updateTransformer()
  }

  /**
   * Enables inline editing of the label with double clicking on the node
   *
   * @param e The [[MouseEvent | Mouse Event]
   */
  private inlineEdit(e: Konva.KonvaEventObject<MouseEvent>) {
    if (isNode() || this.node.isCached()) {
      return
    }
    this.board.events.emit('textSvg:dblclick', {
      shapes: [this]
    })

    e.cancelBubble = true
    this.isEditingEnabled = true
    this.board.setActiveDrawing(DrawType.Text)

    // const position = e.target.absolutePosition()
    const textBeforeEdit = this.textNode.getAttr('text')

    // hide node
    // this.node.hide()
    this.node?.draggable(false)

    // deselect all selected nodes
    this.board.selection.deselectAll()

    const input = document.createElement('span')
    this.board.container
      ?.getElementsByClassName(this.board.settings.containerClassName!)[0]
      ?.append(input)

    if (isBrowser()) {
      this.setInputFocus(input)
    }

    input.setAttribute('contenteditable', '')
    input.setAttribute('role', 'textbox')
    // input.innerText = this.textNode.getAttr('text')
    input.innerText = this.getOrgText()

    // Fix position by relation position of label
    // let left = (position.x - this.textNode.padding()) + (this.textNode.width() * this.node.scaleX() - 188) / 2
    // let bottom = this.board.stage.height() - (position.y - 20)

    let left = (this.board.stage.width() - 188) / 2
    let top = this.board.stage.y()

    Object.assign(input.style, {
      position: 'absolute',
      display: 'inline-block',
      left: `${left}px`,
      top: `${top}px`,
      width: `168px`,
      maxHeight: `90px`,
      fontSize: `16px`,
      border: 'none',
      padding: `10px`,
      margin: `0px`,
      overflow: 'auto',
      background: 'rgba(0,0,0,0.85)',
      borderRadius: `10px`,
      outline: 'none',
      resize: 'none',
      transformOrigin: 'left top',
      textAlign: this.textNode.align(),
      color: '#fff'
    })

    if (isBrowser()) {
      input.addEventListener('keyup', this.onKeyUp.bind(this))
    }

    input.addEventListener('blur', (e: Event) => {
      this.isEditingEnabled = false

      input.parentNode?.removeChild(input)

      this.board.setActiveDrawing(null)

      const newText = convertHtmlToText((<HTMLSpanElement>e.target).innerHTML)
      // if (newText !== textBeforeEdit) {
      //   this.board.history.create(this.board.layer, [], {
      //     undo: () => this.changeText(textBeforeEdit),
      //     redo: () => this.changeText(newText)
      //   })
      // }

      // update label's text
      this.textNode.setAttrs({
        text: newText,
        orgText: newText
      })

      // this.node.show()
      this.node.setAttrs({
        draggable: this.board.settings.selection?.interactive,
        width: this.textNode.width()
      })

      if (this.referShape && !this.referShape.isVisible) {
        this.referShape.setOrgText(newText)
      }

      // select node
      this.board.selection.add(this)
    })
  }

  /**
   * Changes the text value of the label
   *
   * @param value The text value
   */
  private changeText(value: string) {
    this.textNode.setAttrs({
      text: value
    })

    this.updateTransformer()

    this.board.events.emit('label:update-text', {
      shapes: [this],
      data: {
        text: value
      }
    })
  }

  /**
   * updates transformer after changing text
   */
  private updateTransformer() {
    if (this.board.selection.isVisible) {
      this.board.selection.transformer.forceUpdate()
    }
  }

  /**
   * Focuses on the input to start editing that
   *
   * @param input The [[HTMLSpanElement]]
   */
  private async setInputFocus(input: HTMLSpanElement) {
    await new Promise(resolve => setTimeout(resolve, 50))

    const range = document.createRange()
    range.selectNodeContents(input)
    range.collapse(false)

    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
  }

  /**
   * Handles global keyboard events
   *
   * @param e The keyboard event
   */
  private onKeyUp(
    e: Event & {
      key: string
      metaKey: boolean
      ctrlKey: boolean
      shiftKey: boolean
    }
  ) {
    // const isSpecialKey = e.metaKey || e.ctrlKey
    // const isShiftKey = e.shiftKey === true
    // const key = e.key.toLowerCase()
    // @ts-ignore
    const newText = convertHtmlToText((<HTMLSpanElement>e.target).innerHTML)
    this.board.events.emit('label:update-text', {
      shapes: [this],
      data: {
        text: newText
      }
    })
  }

  /**
   * return fontSize of Text
   * @param attributes
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public getFontSize(): number {
    const node = this.textNode
    const scale = node.getAbsoluteScale()
    let fontSize = Math.ceil(node.fontSize() * scale.x)
    return fontSize
  }

  /**
   * Set fontSize for Text by Scale
   * @param fontSize
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public setFontSize(fontSize: number) {
    const node = this.textNode
    const scale = node.getAbsoluteScale()
    this.updateText({
      fontSize: Math.ceil(fontSize / scale.x)
    })
  }

  private textChange(e: Konva.KonvaEventObject<MouseEvent>) {
    this._syncAttrs()
    this.updateTransformer()
  }

  private tagFillChange(e: Konva.KonvaEventObject<MouseEvent>) {
    let tag = this.tagNode
    if (tag) {
      if (this.referShape && !this.referShape.isVisible) {
        try {
          // Sync Position for Label
          this.referShape.updateTag({
            fill: tag.getAttr('fill')
          })
        } catch (e) {
          console.log('Error:', e)
        }
      }
    }
  }

  private _syncAttrs() {
    let text = this.textNode
    let tag = this.tagNode
    if (text && tag) {
      const textAttrs = text.getAttrs()

      if (this.referShape && !this.referShape.isVisible) {
        try {
          this.referShape.updateText({
            fontFamily: textAttrs.fontFamily,
            fontSize: textAttrs.fontSize,
            fontStyle: textAttrs.fontStyle,
            fill: textAttrs.fill,
            letterSpacing: textAttrs.letterSpacing,
            orgText: textAttrs.orgText
          })

          // Set attributes for Label from TextSvg
          this.referShape.node.setAttrs({
            rotation: this.node.getAttr('rotation')
          })
          this.syncPosition()
        } catch (e) {
          console.log('Error:', e)
        }
      }
    }
  }

  /**
   * Sync position between shapes
   * @private
   */
  private rotationChange(e: Konva.KonvaEventObject<MouseEvent>) {
    this.referShape.node.setAttrs({
      rotation: this.node.getAttr('rotation')
    })
    this.syncPosition()
  }

  /**
   * Sync position between shapes
   * @public
   */
  public syncPosition() {
    if (this.referShape && !this.referShape.isVisible) {
      const rect = this.node.getClientRect()
      const refRect = this.referShape.node.getClientRect()
      const refAttr = this.referShape.node.attrs

      const center = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2
      }

      const deltaX = Math.abs(refAttr.x - refRect.x)
      const deltaY = Math.abs(refAttr.y - refRect.y)
      this.referShape.node.setAttrs({
        x: center.x - (refRect.width / 2 - deltaX),
        y: center.y - (refRect.height / 2 - deltaY)
      })
    }
  }

  /**
   * Set Label for sync data when TextSvg change anything
   * @param referShape
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public setReferTextSvg(referShape: TextSvgModel) {
    this.referShape = referShape
  }

  /**
   * Return refer TextSvgModel object
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public getReferTextSvg() {
    return this.referShape
  }

  /**
   * Set Label for sync data when TextSvg change anything
   * @param referShape
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public setReferShape(referShape: TextSvgModel) {
    this.referShape = referShape
  }

  /**
   * Return refer TextSvgModel object
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public getReferShape() {
    return this.referShape
  }
}
