---
title: An oak tree
summary: A trunk and some leaves, made of shapes.
---

Every squirrel needs an oak tree. Ours is made of shapes: a brown trunk and three round bunches of leaves.

<!-- changes -->
<!-- playground -->

**Press Run.** The oak stands behind the squirrel. Move the mouse to run in front of it.

## How it works

- The trunk is a `rect`, like the grass. The leaves are `circle`s, a new shape. A circle's `x` and `y` are its middle, and its `radius` is how far it reaches from the middle to the edge.
- The three circles overlap, so they look like one big bush of leaves.
- The order of the scene matters. Things are drawn one after another, and later things cover earlier things. The trunk and leaves come first, then the grass, then the squirrel. So the squirrel is in front of the tree.
- Every new thing has to be in the list that `return` hands back. If it is not on the list, it is not drawn.

## Try this

- Change all three `"darkgreen"`s to `"orange"`. Autumn! Other colour names that work: `"red"`, `"gold"`, `"hotpink"`, `"tomato"`.
- Make a fourth circle for the leaves. Do not forget to add it to the `return` list.
- Put `squirrel` first in the `return` list. What happens, and why?
- **Challenge:** make the oak wider, so that its leaves reach from one side of the picture to the other.

## Words we met

- **radius**: how far a circle reaches, from its middle to its edge.
- **list**: things in order, between `[` and `]`, with commas between them. The scene is a list.
