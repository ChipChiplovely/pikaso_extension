import Konva from 'konva'

import {ShapeModel} from '../shape/ShapeModel'
import {ImageModel} from '../shape/models/ImageModel'

export interface ReflectConfig {
  isReflect: boolean
  opacity: number
  offset: number
  reflectHeight: number
}

export class Reflect {
  config: ReflectConfig
  shape: ShapeModel
  reflectImage: ImageModel

  constructor(shape: ShapeModel, reflectImage: ImageModel) {
    this.config = {
      isReflect: false,
      opacity: 1,
      offset: 1,
      reflectHeight: 1,
      ...shape.node.attrs.reflection
    }
    this.shape = shape
    this.reflectImage = reflectImage
  }

  public reflectionImage(ctx: Konva.Context, shape: Konva.Image) {
    let reflectionHeight = shape.height() * this.config.reflectHeight
    const img = shape.getAttr('image')
    ctx.save()
    ctx.translate(0, shape.height() + reflectionHeight + this.config.offset)
    ctx.scale(1, -1)
    ctx.globalAlpha = this.config.opacity
    ctx.drawImage(img, 0, 0, shape.width(), reflectionHeight)
    ctx.globalAlpha = 1
    let gradient = ctx.createLinearGradient(0, 0, 0, reflectionHeight)
    // Opaque white in the top
    gradient.addColorStop(0, 'rgb(255,255,255, 1)')
    // Transparent white at the bottom
    gradient.addColorStop(1, 'rgb(255,255,255, 0)')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = gradient

    ctx.fillRect(0, 0, shape.width(), reflectionHeight)
    ctx.restore()
  }

  public reloadReflection() {
    if (this.config.isReflect) {
      this.reflectImage.show()
      const theta = this.shape.node.rotation()
      this.shape.rotate(0)
      this.shape.node.toImage().then(img => {
        if (this.shape.type === 'textSvg') {
          const attrs = this.shape.node.getAttrs()
          const rect = this.shape.node.getClientRect()
          this.reflectImage.node.setAttrs({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            scaleX: attrs.scaleX,
            scaleY: attrs.scaleY,
            skewX: attrs.skewX,
            skewY: attrs.skewY
          })
        } else {
          this.reflectImage.node.setAttrs({
            x: this.shape.node.x(),
            y: this.shape.node.y(),
            width: this.shape.node.width(),
            height: this.shape.node.height(),
            scaleX: this.shape.node.scaleX(),
            scaleY: this.shape.node.scaleY(),
            skewX: this.shape.node.skewX(),
            skewY: this.shape.node.skewY()
          })
        }

        this.reflectImage.node.clearCache()
        this.reflectImage.node.setAttr('image', img)
        // this.reflectImage.node.sceneFunc((ctx, shape) => {
        //   this.reflectionImage(ctx, shape)
        // })
        this.changeConfig()
      })
      this.shape.rotate(theta)
    } else {
      this.reflectImage.hide()
    }
  }

  public changeConfig() {
    this.reflectImage.node.sceneFunc((ctx, shape) => {
      this.reflectionImage(ctx, shape)
    })
  }
  /**
   * Update config
   * @param config
   */
  public updateConfig(config: ReflectConfig) {
    this.config = { ...config }
    this.shape.node.attrs.reflection = this.config
    this.reloadReflection()
  }
}
