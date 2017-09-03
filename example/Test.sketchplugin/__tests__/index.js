const path = require('path');

const sketchtool = require('sketchtool-cli');
const inspector = require('sketch-test-inspector');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
inspector.reset();
inspector.setPlugin('Test.sketchplugin');

describe('First Step', () => {
  describe('Makes sketchtool available as cli util as part of the testing framework', () => {
    it('Can access sketchtool binary methods', () => {
      expect(sketchtool.version()).toBeTruthy();
    });
  });
});

const testFile = path.resolve(__dirname, './Test.sketch');

describe('Opening files', () => {
  describe('The inspector can open a specified file in preparation to run plugin commands on it', () => {
    inspector.openFile(testFile);
    const layers = inspector.layers();

    it('Can read all pages of the opened document', () => {  
      expect(layers.pages.length).toBe(1);
      expect(layers.pages[0].name).toBe('Page 1');
    });

    it('Can access the layers of those pages', () => {
      const pageLayers = layers.pages[0].layers;
      expect(pageLayers.length).toBe(3);
      pageLayers.forEach(layer => {
        expect(layer.name.startsWith('Rectangle')).toBeTruthy();
      });
    });

    inspector.closeDocument();
  });
});

describe('Running plugin commands', () => {
  describe('The inspector can run plugin commands on the opened file (something sketchtool cannot do out of the box!)', () => {
    it('Can use the `setSelection` util from inspector', done => {
      inspector.openFile(testFile);
      const layers = inspector.layers().pages[0].layers;
      inspector.selectLayers([layers[2]]);
      inspector.runPluginCommand('removeSelected')
        .then(() => {
          const newLayers = inspector.layers().pages[0].layers;
          expect(newLayers.length).toBe(layers.length - 1);
          inspector.closeDocument();
          done();
        })
        .catch(e => {
          inspector.closeDocument();
          done.fail(e);
        });
    });

    it('Can access the pages and layers of the file after the command has been run', done => {
      inspector.openFile(testFile);
      inspector.runPluginCommand('renameAllRectangles')
        .then(() => {
          const pageLayers = inspector.layers().pages[0].layers;
          const layerNames = pageLayers.map(layer => layer.name);
          expect(layerNames).toEqual([
            'Circle',
            'Circle 2',
            'Circle 3'
          ]);
          inspector.closeDocument();
          done();
        })
        .catch(e => {
          inspector.closeDocument();
          done.fail(e);
        });
    });

  });
});
