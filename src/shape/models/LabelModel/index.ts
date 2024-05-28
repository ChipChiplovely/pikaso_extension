import Konva from 'konva'

import {convertHtmlToText} from '../../../utils/html-to-text'

import {Board} from '../../../Board'
import {ShapeModel} from '../../ShapeModel'
import {isBrowser, isNode} from '../../../utils/detect-environment'
import {rotateAroundCenter} from '../../../utils/rotate-around-center'
import {DrawType, LabelConfig} from '../../../types'

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
   * add more original text no format
   */
  private orgText: string

  constructor(board: Board, node: Konva.Label, config: LabelConfig = {}) {
    super(board, node, config)

    this.config = config
    this.orgText = node.getText().text()
    node.on('transform', this.transform.bind(this))
    node.on('dblclick', this.inlineEdit.bind(this))
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
   * Updates attributes of the label's tag
   *
   * @param attributes The list of attributes
   */
  public updateTag(attributes: Partial<Konva.TagConfig>) {
    this.board.history.create(this.board.layer, this.tagNode)
    this.tagNode.setAttrs(attributes)
  }

  /**
   * Updates attributes of the label's tag
   *
   * @param attributes The list of attributes
   */
  public updateText(attributes: Partial<Konva.TextConfig>) {
    this.board.history.create(this.board.layer, this.textNode)
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
        scaleX: this.node.scaleY(),
        wrap: 'word'
      })

      this.node.scaleX(this.textNode.scaleY())
      this.tagNode.scaleX(this.node.scaleY())
    }
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

    // e.cancelBubble = true
    this.isEditingEnabled = true
    this.board.setActiveDrawing(DrawType.Text)

    // const position = e.target.absolutePosition()
    const textBeforeEdit = this.textNode.getAttr('text')

    // hide node
    // this.node.hide()
    this.node?.draggable(false)

    // deselect all selected nodes
    this.board.selection.deselectAll()

    const input = document.createElement('textarea')
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

      const newText = convertHtmlToText(
        (<HTMLTextAreaElement>e.target).value
      )
      console.log('newText', newText)
      if (newText !== textBeforeEdit) {
        this.board.history.create(this.board.layer, [], {
          undo: () => this.changeText(textBeforeEdit),
          redo: () => this.changeText(newText)
        })
      }

      // update label's text
      this.textNode.setText(newText)

      // update original text
      this.setOrgText(newText)
      // this.node.show()
      this.node.setAttrs({
        draggable: this.board.settings.selection?.interactive,
        width: this.textNode.width()
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
  private async setInputFocus(input: HTMLTextAreaElement) {
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
    const newText = convertHtmlToText((<HTMLTextAreaElement>e.target).innerHTML)
    this.board.events.emit('label:update-text', {
      shapes: [this],
      data: {
        text: newText
      }
    })
  }
}
