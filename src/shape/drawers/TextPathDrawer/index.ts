import Konva from 'konva'

import {Board} from '../../../Board'

import {TextPathModel} from '../../models/TextPathModel'

export class TextPathDrawer {
  /**
   * Represents the [[Board]]
   */
  private readonly board: Board

  /**
   * Demonstrates the text shape that is being created
   */
  public node: Konva.TextPath

  /**
   * Creates a new text builder component
   *
   * @param board The [[Board]]
   */
  constructor(board: Board) {
    this.board = board
  }

  /**
   * @inheritdoc
   * @override
   */
  public insert(config: Konva.TextPathConfig): TextPathModel {
    this.node = new Konva.TextPath(config)
    return new TextPathModel(this.board, this.node)
  }
}
