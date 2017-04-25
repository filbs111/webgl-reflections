want to be able to
a) show regular reflections in arbitrary shapes (eg teapot)
b) make a magic mirror portal in a sphere object

TODO
0) render a sphere/teapot/cube within an environment that will be reflected in it
1) allow the environment to be adjusted (eg scalable room box, some animated model)
2) allow the camera to be moved, and add a spaceship that can be dropped

3) implement standard cubemapping for general shape, with cubemap views drawn from camera at shape's centre
4) test adjusting cubemap camera point so moves closer when... 
 TODO get maths for this from ball-reflect project
  (for sphere, reflect, and for teapot where teapot has an sphere that represents it?)
 
5) experiment with vertex shader methods to render reflection to final render target, test it broadly matches up with results from 4

6) add a second sphere, and a switch to toggle reflections between the two. (place a wall such that spheres cannot "see eachother")

7) allow the player to fly into one sphere and out of the other.


done:
draw object that will reflect 
draw an environment around object
allow camera to move (controls)
draw cubemap from object centre
shader that projects cubemap onto surface of "reflecting" object (vert shader?)
shader that uses object normals to instead of position for same (ie independent of cam position)
shader that does reflection correct for distant reflected items
option to displace cubemap rendering point (dependent on camera position) from centre of sphere to "optimal" point A/(2|A|-1), where A is position of player camera
cap player position outside sphere.
2 worlds. option to toggle reflect and portal. 
fly through portal. (position capped when portal off)
draw player at "opposite" spot in other world
use "discard" in frag shader to not draw parts inside ball

todo:
draw sphere without near clip? apparently not a standard gl option - should work around. https://www.opengl.org/archives/resources/faq/technical/clipping.htm

COSMETIC
ambient lighting - different for each world, leaks through portal (basically ball light). light world, dark world?

MECHANICS
when near portal surface (eg near half in/out of portal), have tendency to orbit portal (when try to move along surface of ball, pointing direction should turn)
smooth movement with momentum

CLIPPING
improve drawing of object crossing the ball, so parts seen in camera world match up with parts drawn in other world. vert shader to distort verts inside sphere?
drawing object crossing portal only once? (non-cubemap)
ability to shoot bullets and see them go through portal

CUBEMAP IMPROVEMENTS
aligning to point at player
disable drawing of "back" view?
limit drawing of side views?
scaling so facing pix res proportional to size on screen
skewing?

DIRECT RENDERING
direct to screen vertex rendering (not sure what equations here to get things working ideally - can likely work out reflection "direction" ok,
but how to scale homogenous co-ord such that works well....)
decide what rules have to follow to ensure that z interpolation doesn't cause artefacts

"CORRECTED" REFLECTION
(not just simple projection from sweet spot)

