/// <reference types="cypress" />
/// <reference path="../../../support/index.d.ts" />

describe('Shapes -> Circle', () => {
  beforeEach(() => {
    cy.reload()
  })

  it('should create a circle', () => {
    cy.getEditor().then(editor => {
      const config = {
        name: 'circle',
        x: 200,
        y: 200,
        radius: 150,
        fill: '#ccc'
      }

      editor.shapes.circle.insert(config)

      const shapes = editor.board.stage.find(`.${config.name}`)

      expect(shapes.length).equal(1)
      expect(shapes[0].attrs).to.eql({
        ...config,
        draggable: true
      })
    })
  })

  it('should draw a circle', () => {
    cy.getEditor().then(editor => {
      editor.shapes.circle.draw({
        fill: '#ccc'
      })

      cy.draw([300, 300], [400, 400]).then(() => {
        expect(editor.board.shapes.length).equal(1)
      })
    })
  })

  it('should select the circle after creation', () => {
    cy.getEditor().then(editor => {
      const circle = editor.shapes.circle.insert({
        x: 200,
        y: 200,
        radius: 100,
        fill: '#ccc'
      })

      cy.get('canvas')
        .trigger('mousedown', {
          clientX: 200,
          clientY: 200
        })
        .then(() => {
          expect(editor.board.selectionsTransformer.attrs.visible).equal(true)

          expect(
            editor.board.selectionsTransformer.nodes().indexOf(circle.node)
          ).equal(0)
        })
    })
  })
})