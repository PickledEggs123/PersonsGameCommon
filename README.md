# PersonsGameCommon
The common types, functions, and controllers that are used both by the frontend and backend.

Types
===
Types are used to keep a consistent format for data moving between the frontend and backend. Types
will autocomplete property names and autocomplete the syntax of nested objects.

Functions
===
Perform common features used by both the frontend and backend such as interpolating the state
of an object.

Controllers
===
Perform common procedures on a data containing object like harvesting resources from a resource node or
picking up, dropping, and crafting items in an inventory. The frontend and backend will use the same
controllers to handle resources and crafting.

History
===
6/7/2020
---
Added CellController to manage NPCs. The game is based around building houses for NPCs which will then work for you. The
NPC will perform different jobs. There are currently 3 jobs planned so far: gathering, crafting, and hauling. Gatherers
will walk around to trees, rocks and ponds and gather wood, sticks, stone, clay, coal, iron, reed, and mud. These items
will be stored into a stockpile that the player designates. The stockpile can store 100 items per slot per tile: 100
wood (default of 1), 400 wattles (default of 4), or 1000 sticks (default of 10). The crafter will withdraw items from
the stockpile and convert them into more useful objects (wattle wall to make more houses) then deposit the crafted item
into the stockpile. The hauler will move resources from far away towns to the local town. This is required when biomes
are introduced since each biome is a 5 minute circle of different items. Deserts will have sand for crafting glass, forests
will have trees for crafting wooden homes, and swamps will have lots of ponds to produce mud bricks.

The cell controller will compute paths and object changes for the next 1 minute to 4 hours within a few seconds. The game
is based on HTTP rest calls which run every 2 seconds and cloud function timers which run every 1 minute. Instead of moving
one step per minute, it will plan out all gathering, crafting, and hauling ahead of time in a few seconds. The player will
receive a list of changes over time which is then used to draw the correct state at a moment in time.

Summary
---
NPC planning library which computes all paths and object pickup, object drop, object craft for an entire minute in less
than a second. The library is meant to run in a cloud function every minute.

New features:
- Stockpiles
- NPCs
- NPC Jobs:
    - Gathering
    - Crafting

5/16/2020
---
Moved separate frontend and backend code for harvesting resources and inventory management into a common npm package.
The reason for duplicate code is client side prediction of server created objects. Using a random number generator, the
id of an item can be predicted before it is created. This will avoid the lag of waiting for the round trip from client
to server and back to client (clicking on a tree should instantly create a stick or wood). In reality, the item has not
been created yet but we can create the item client side and wait for the server to catch up.

There are 2 new controllers.

HarvestResource controller for predicting the next spawns of a resource. The client and
server will use the controller to compute the same set of spawns. Each resource has a random seed and random number
number generator state. Spawning and item will update the state used to generate the next item. Given the same state,
the same set of items will be generated.

Inventory controller is used for picking up items, dropping items and crafting items into new items. Some items can be
stacked (with multiple items in the same slot) and each inventory has a fixed amount of slots. This will result in an
inventory full error and not enough crafting materials error. Instead of copying the functions twice for the frontend
and backend, the controller will store the inventory related functions in one location.