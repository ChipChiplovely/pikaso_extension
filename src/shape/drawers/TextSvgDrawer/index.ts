import Konva from 'konva'

import {Board} from '../../../Board'

import {TextSvgModel} from '../../models/TextSvgModel'
import type { TextPathConfig } from '../../../types/shapes'

export class TextSvgDrawer {
  /**
   * Represents the [[Board]]
   */
  private readonly board: Board

  /**
   * Creates a new text builder component
   *
   * @param board The [[Board]]
   */
  constructor(board: Board) {
    this.board = board
  }

  // @ts-ignore
  /**
   * @inheritdoc
   * @override
   */
  public insert({
      container,
      textPath,
      tag,
      config
    }: {
      container?: Konva.ContainerConfig,
      textPath: Konva.TextPathConfig,
      tag?: Konva.TagConfig,
      config?: TextPathConfig
    }): TextSvgModel {
    const textSvg = new Konva.Group({
      ...container,
      draggable: this.board.settings.selection?.interactive
    })
    textSvg.className = 'TextSvg'
    const textPathNode = new Konva.TextPath(textPath)
    const tagNode = new Konva.Tag(tag)
    textSvg.add(tagNode).add(textPathNode)
    return new TextSvgModel(this.board, textSvg, config)
  }
}
