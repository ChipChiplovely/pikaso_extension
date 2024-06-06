import Konva from 'konva'

import {convertHtmlToText} from '../../../utils/html-to-text'
import {Board} from '../../../Board'
import {isBrowser, isNode} from '../../../utils/detect-environment'
import {rotateAroundCenter} from '../../../utils/rotate-around-center'
import {ShapeModel} from '../../ShapeModel'
import {LabelModel} from '../LabelModel'
import {DrawType, TextSvgConfig} from '../../../types'

export class TextSvgModel extends ShapeModel<Konva.Group, Konva.GroupConfig> {
  /**
   * add more original text no format
   */
  /**
   * Refer to label to synchonize
   * @private
   */
  private referShape: LabelModel

  constructor(board: Board, node: Konva.Group, config: TextSvgConfig = {}) {
    super(board, node, config)
    this.config = config
    node.on('dblclick', this.inlineEdit.bind(this))
    node.on('transformend', this.transformend.bind(this))
    node.on('dragend', this.dragendChange.bind(this))
    node.on('rotationChange', this.rotationChange.bind(this))
    node.find('TextPath')[0].on('dataChange', this.sync.bind(this))
    node.find('TextPath')[0].on('fontFamilyChange', this.sync.bind(this))
    node.find('TextPath')[0].on('fontSizeChange', this.sync.bind(this))
    node.find('TextPath')[0].on('textChange', this.textChange.bind(this))
    node.find('TextPath')[0].on('letterSpacingChange', this.sync.bind(this))
    node.find('TextPath')[0].on('alignChange', this.sync.bind(this))
    node.find('TextPath')[0].on('fillChange', this.sync.bind(this))
    node.find('Tag')[0].on('fillChange', this.tagFillChange.bind(this))
    this._syncAttrs()
  }

  /**
   * @inheritdoc
   */
  public get type(): string {
    return 'textSvg'
  }

  /**
   * Returns the text node of the label
   */
  public get textPathNode() {
    return this.node.find('TextPath')[0] as Konva.TextPath
  }

  /**
   * Returns the tag node of the label
   */
  public get tagNode() {
    return this.node.find('Tag')[0] as Konva.Tag
  }

  /**
   * Returns the original content of Text
   */
  public getOrgText() {
    return this.textPathNode.getAttr('orgText')
  }

  /**
   * Set Content to origin text
   * @param orgText
   */
  public setOrgText(orgText: string) {
    this.updateText({orgText: orgText, text: orgText})
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
   * Enables inline editing of the TextSvg with double clicking on the node
   *
   * @param e The [[MouseEvent | Mouse Event]
   */
  private inlineEdit(e: Konva.KonvaEventObject<MouseEvent>) {
    if (isNode() || this.node.isCached()) {
      return
    }

    e.cancelBubble = true
    this.board.setActiveDrawing(DrawType.TextPath)

    const textBeforeEdit = this.textPathNode.getAttr('text')
    // hide node
    // this.node.hide()
    this.textPathNode?.draggable(false)

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
    // const box = this.node.getClientRect()
    input.innerText = this.textPathNode.getAttr('text')
    // let left = box.x + (box.width - 188) / 2
    // let bottom = this.board.stage.height() - (box.y - 20)
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
      textAlign: this.textPathNode.getAttr('align'),
      color: '#fff'
    })
    if (isBrowser()) {
      input.addEventListener('keyup', this.onKeyUp.bind(this))
    }

    input.addEventListener('blur', (e: Event) => {
      input.parentNode?.removeChild(input)

      this.board.setActiveDrawing(null)

      const newText = convertHtmlToText((<HTMLSpanElement>e.target).innerHTML)

      if (newText !== textBeforeEdit) {
        this.board.history.create(this.board.layer, [], {
          undo: () => this.changeText(textBeforeEdit),
          redo: () => this.changeText(newText)
        })
      }

      // update label's text
      // this.node.text(newText)
      // this.node.show()

      this.updateText({
        draggable: false,
        text: newText,
        orgText: newText
      })
      if (this.referShape) {
        this.referShape.setOrgText(newText)
        this.syncPosition()
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
    this.board.events.emit('textPath:update-text', {
      shapes: [this],
      data: {
        text: value
      }
    })
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
    this.board.events.emit('textPath:update-text', {
      shapes: [this],
      data: {
        text: newText
      }
    })
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public getWidth() {
    return this.textPathNode.width()
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public getHeight() {
    return this.textPathNode.height()
  }

  /**
   * return fontSize of TextPath
   * @param attributes
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public getFontSize(): number {
    const node = this.textPathNode
    const scale = node.getAbsoluteScale()
    let fontSize = Math.ceil(node.fontSize() * scale.x)
    return fontSize
  }

  /**
   * Set fontSize for TextPath by Scale
   * @param fontSize
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public setFontSize(fontSize: number) {
    const node = this.textPathNode
    const scale = node.getAbsoluteScale()
    this.updateText({
      fontSize: Math.ceil(fontSize / scale.x)
    })
  }

  /**
   * Update Attributes for TextPath object
   * @param attributes
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public updateText(attributes: Partial<Konva.TextPathConfig>) {
    this.board.history.create(this.board.layer, this.textPathNode)
    this.textPathNode.setAttrs(attributes)

    this.updateTransformer()
  }

  /**
   * Update Attributes for Tag object
   * @param attributes
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public updateTag(attributes: Partial<Konva.TagConfig>) {
    this.board.history.create(this.board.layer, this.tagNode)
    this.tagNode.setAttrs(attributes)

    this.updateTransformer()
  }

  private _syncAttrs() {
    let textPath = this.textPathNode
    let tag = this.tagNode
    if (textPath && tag) {
      const sRect = textPath.getSelfRect()
      const textPathAttrs = textPath.getAttrs()
      const scale = this.node.getAbsoluteScale()
      tag.setAttrs({
        x: sRect.x,
        y: sRect.y,
        width: sRect.width,
        height: sRect.height
      })

      if (this.referShape && !this.referShape.isVisible) {
        try {
          // Sync Position for Label
          this.referShape.updateText({
            fontFamily: textPathAttrs.fontFamily,
            fontSize: textPathAttrs.fontSize,
            fontStyle: textPathAttrs.fontStyle,
            fill: textPathAttrs.fill,
            letterSpacing: textPathAttrs.letterSpacing,
            orgText: textPathAttrs.orgText
          })

          // Set attributes for Label from TextSvg
          this.referShape.node.setAttrs({
            scaleX: scale.x,
            scaleY: scale.y,
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
   * updates transformer after changing text
   */
  private updateTransformer() {
    if (this.board.selection.isVisible) {
      this.board.selection.transformer.forceUpdate()
    }
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
   * Sync fontsize after changing every thing
   * @param e
   * @private
   */
  private transformend(e: Konva.KonvaEventObject<MouseEvent>) {
    this._syncAttrs()
    this.updateTransformer()
  }

  private textChange(e: Konva.KonvaEventObject<MouseEvent>) {
    this._syncAttrs()
    this.updateTransformer()
  }

  private dragendChange(e: Konva.KonvaEventObject<MouseEvent>) {
    this.syncPosition()
  }

  private rotationChange(e: Konva.KonvaEventObject<MouseEvent>) {
    this.referShape.node.setAttrs({
      rotation: this.node.getAttr('rotation')
    })
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

  /**
   * Sync position between shapes
   * @private
   */
  private syncPosition() {
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

  /**
   * Set Label for sync data when TextSvg change anything
   * @param referShape
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public setReferLabel(referShape: LabelModel) {
    this.referShape = referShape
  }

  /**
   * Return Label model object
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public getReferLabel() {
    return this.referShape
  }

  /**
   * Set Label for sync data when TextSvg change anything
   * @param referShape
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public setReferShape(referShape: LabelModel) {
    this.referShape = referShape
  }

  /**
   * Return Label model object
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public getReferShape() {
    return this.referShape
  }
}
