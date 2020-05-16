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