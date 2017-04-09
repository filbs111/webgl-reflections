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


detailed todo
initialise buffers	DONE
init shaders (simplest plain white shader)
create camera
draw world


