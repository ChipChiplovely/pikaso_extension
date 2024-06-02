import Konva from 'konva'

import {convertHtmlToText} from '../../../utils/html-to-text'
import {Board} from '../../../Board'
import {isBrowser, isNode} from '../../../utils/detect-environment'
import {rotateAroundCenter} from '../../../utils/rotate-around-center'
import {ShapeModel} from '../../ShapeModel'
import {LabelModel} from "../LabelModel";
import {DrawType, TextPathConfig} from '../../../types'

export class TextSvgModel extends ShapeModel<Konva.Group, Konva.GroupConfig> {
  /**
   * add more original text no format
   */
  private orgText: string
  /**
   * Refer to label to synchonize
   * @private
   */
  private labelRefer: LabelModel

  constructor(board: Board, node: Konva.Group, config: TextPathConfig = {}) {
    super(board, node, config)

    this.config = config
    this.orgText = this.textPathNode.getAttr('orgText')
    node.on('dblclick', this.inlineEdit.bind(this))
    node.find('TextPath')[0].on('dataChange', this.sync.bind(this))
    node.find('TextPath')[0].on('fontFamilyChange', this.sync.bind(this))
    node.find('TextPath')[0].on('fontSizeChange', this.sync.bind(this))
    node.find('TextPath')[0].on('textChange', this.textChange.bind(this))
    node.find('TextPath')[0].on('letterSpacingChange', this.sync.bind(this))
    node.find('TextPath')[0].on('alignChange', this.sync.bind(this))
    node.on('dragend', this.sync.bind(this))
    this._sync()
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
    return this.orgText
  }

  /**
   * Set Content to origin text
   * @param orgText
   */
  public setOrgText(orgText: string) {
    this.orgText = orgText
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
   * Enables inline editing of the label with double clicking on the node
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
    // console.log('textBeforeEdit', textBeforeEdit)
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
      // update original text
      this.setOrgText(newText)
      // this.node.show()

      this.textPathNode.setAttrs({
        draggable: false,
        text: newText,
        // data: this.getTextLength()
      })

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

  public getWidth() {
    return this.textPathNode.width()
  }

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

  private _sync() {
    let textPath = this.textPathNode
    let tag = this.tagNode
    if (textPath && tag) {
      const cRect = textPath.getClientRect()
      const sRect = textPath.getSelfRect()
      const textPathAttrs = textPath.getAttrs()
      tag.setAttrs({
        x: sRect.x,
        y: sRect.y,
        width: sRect.width,
        height: sRect.height
      })

      if (this.labelRefer && !this.labelRefer.isVisible) {
        try {
          this.labelRefer.setOrgText(this.getOrgText())
          // Sync Position for Label
          const centerX = cRect.x + cRect.width / 2
          const centerY = cRect.y + cRect.height / 2
          let lRect = this.labelRefer.node.getClientRect()
          this.labelRefer.node.setAbsolutePosition({
            x: centerX - lRect.width / 2,
            y: centerY - lRect.height / 2
          })
          this.labelRefer.updateText({
            fontFamily: textPathAttrs.fontFamily,
            fontSize: textPathAttrs.fontSize,
            fontStyle: textPathAttrs.fontStyle,
            fill: textPathAttrs.fill,
            letterSpacing: textPathAttrs.letterSpacing,
            rotation: textPathAttrs.rotation
          })
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
    this._sync()
    this.updateTransformer()
  }

  private textChange(e: Konva.KonvaEventObject<MouseEvent>) {
    // this._sync()
    // this.updateTransformer()
    this.textPathNode.setAttrs({
      draggable: false,
      data: this.getTextLength(50)
    })
    console.log('Change Tex')
  }

  /**
   * Set Label for sync data when TextSvg change anything
   * @param labelRef
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public setLabelRefer(labelRef: LabelModel) {
    this.labelRefer = labelRef
  }

  /**
   * Return Label object
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public getLabelRefer() {
    return this.labelRefer
  }

  private getTextLength(percent: number) {
    let l = this.calCurvatureLength()
    let r = (l * 100 / percent) / (2 * Math.PI)
    let d = this.getArcPath(l, Math.abs(r), percent > 0 ? 1: 0, Math.abs(percent) === 100 ? true : false);
    console.log('r, l, d', r, l, d)
    return d
  }

  private calCurvatureLength() {
    const letterSpacing = this.textPathNode.letterSpacing()
    // @ts-ignore
    const length = this.textPathNode._getTextSize(this.textPathNode.text).width
    const textWidth = Math.max(
      length + ((this.textPathNode.text || '').length - 1) * letterSpacing,
      0
    )
    return textWidth
  }

  /**
   * Get ArcPath of text and length
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  private getArcPath(
    l: number,
    r: number,
    sweepFlag: number,
    fullCycle: boolean
  ) {
    const upc = sweepFlag
    const n = (l / (2 * Math.PI * r)) * (Math.PI * 2)
    const n2 = n / 2
    const largeArcFlag = n > Math.PI ? 1 : 0
    const ax = Math.abs(r * Math.sin(n2))
    const ay = Math.abs(r * Math.cos(n2))
    let x1, y1, x2, y2
    x1 = r - ax
    x2 = r + ax
    if (fullCycle) {
      x1 = 0
      y1 = 0
      x2 = 1
      y2 = 0
    } else {
      if (upc) {
        y1 = y2 = r + ay
      } else {
        y1 = y2 = r - ay
      }
    }
    x2 -= x1, y2 -= y1, x1 = 0, y1 = 0
    return `M${x1},${y1} A${r},${r} 0 ${largeArcFlag},${sweepFlag} ${x2},${y2}`
  }

  /**
   * Update data for TextPath when the system change Percent of Arc
   * @param percent
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public setPercent(percent: number) {
    this.textPathNode.setAttrs({
      draggable: false,
      data: this.getTextLength(percent)
    })
    console.log('Update Data')
    this._sync()
    this.updateTransformer()
  }
}
