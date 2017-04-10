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

todo:
draw an environment around object
allow camera to move (controls)
draw cubemap from object centre
shader that projects cubemap onto surface of "reflecting" object (vert shader?)
shader that uses object normals to instead of position for same (ie independent of cam position)
shader that does attempt to do actual reflection (dependent on cam position) - 2 variations - using vert normal, and "perfect sphere" normal.
option to displace cubemap rendering point (dependent on camera position)
----
??? option to render something approaching what will finally do - not true reflection vector (similar to parabolic reflector)
vertex rendering (not sure what equations here to get things working ideally - can likely work out reflection "direction" ok,
but how to scale homogenous co-ord such that works well....)
