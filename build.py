import sys
t=open('src/template.html').read()
css=open('src/style.css').read()
js='\n'.join(open('src/'+f).read() for f in ['content.js','engine.js','levels.js','game.js','ui.js','questions.js'])
out=t.replace('/*CSS*/',css).replace('/*JS*/',js)
open('index.html','w').write(out)
# local test copy with local three
open('test.html','w').write(out.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','node_modules/three/build/three.min.js'))
print(len(out))
