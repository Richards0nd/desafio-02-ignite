const express = require("express");
const cors = require("cors");

const { v4: uuidv4, validate } = require("uuid");

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(req, res, next) {
  const { username } = req.headers;

  const user = users.find((user) => user.username === username);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  req.user = user;
  return next();
}

function checksCreateTodosUserAvailability(req, res, next) {
  const { user } = req;

  if (!user.pro && user.todos.length + 1 >= 10) {
    return res
      .status(403)
      .json({ error: "Exceeded total task limit. Upgrade to PRO plan" });
  }
  return next();
}

function checksTodoExists(req, res, next) {
  const { username } = req.headers;
  const { id: todoId } = req.params;

  const user = users.find((user) => user.username === username);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!validate(todoId)) {
    return res.status(400).json({ error: "Todo ID is not valid" });
  }

  const todo = user.todos.find((todo) => todo.id === todoId);
  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }

  req.todo = todo;
  req.user = user;
  return next();
}

function findUserById(req, res, next) {
  const { id } = req.params;

  const user = users.find((user) => user.id === id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  req.user = user;
  return next();
}

app.post("/users", (req, res) => {
  const { name, username } = req.body;

  const usernameAlreadyExists = users.some(
    (user) => user.username === username
  );

  if (usernameAlreadyExists) {
    return res.status(400).json({ error: "Username already exists" });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: [],
  };

  users.push(user);

  return res.status(201).json(user);
});

app.get("/users/:id", findUserById, (req, res) => {
  const { user } = req;

  return res.json(user);
});

app.patch("/users/:id/pro", findUserById, (req, res) => {
  const { user } = req;

  if (user.pro) {
    return res.status(400).json({ error: "Pro plan is already activated." });
  }

  user.pro = true;

  return res.json(user);
});

app.get("/todos", checksExistsUserAccount, (req, res) => {
  const { user } = req;

  return res.json(user.todos);
});

app.post(
  "/todos",
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  (req, res) => {
    const { title, deadline } = req.body;
    const { user } = req;

    const newTodo = {
      id: uuidv4(),
      title,
      deadline: new Date(deadline),
      done: false,
      created_at: new Date(),
    };

    user.todos.push(newTodo);

    return res.status(201).json(newTodo);
  }
);

app.put("/todos/:id", checksTodoExists, (req, res) => {
  const { title, deadline } = req.body;
  const { todo } = req;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return res.json(todo);
});

app.patch("/todos/:id/done", checksTodoExists, (req, res) => {
  const { todo } = req;

  todo.done = true;

  return res.json(todo);
});

app.delete(
  "/todos/:id",
  checksExistsUserAccount,
  checksTodoExists,
  (req, res) => {
    const { user, todo } = req;

    const todoIndex = user.todos.indexOf(todo);

    if (todoIndex === -1) {
      return res.status(404).json({ error: "Todo not found 3" });
    }

    user.todos.splice(todoIndex, 1);

    return res.status(204).json({ menssage: "Todo deleted!" });
  }
);

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById,
};
