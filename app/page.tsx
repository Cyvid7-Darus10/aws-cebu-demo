"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";

const client = generateClient<Schema>();

export default function App() {
  const router = useRouter();
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [newTodo, setNewTodo] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  function listTodos() {
    const sub = client.models.Todo.observeQuery().subscribe({
      next: (data) => {
        setTodos([...data.items]);
        setIsLoading(false);
      },
    });
    return () => sub.unsubscribe();
  }

  useEffect(() => {
    if (authStatus === "authenticated") {
      const unsubscribe = listTodos();
      return unsubscribe;
    }
    if (authStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [authStatus]);

  function createTodo() {
    const content = newTodo.trim();
    if (!content) return;
    client.models.Todo.create({ content });
    setNewTodo("");
  }

  return (
    <main>
      {authStatus !== "authenticated" ? null : (
        <>
          <div className="todo-header">
            <h1>My todos</h1>
            <span className="muted">{todos.length} total</span>
          </div>
          <div className="todo-form">
            <input
              className="input"
              placeholder="Add a new todo..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createTodo();
              }}
            />
            <button className="btn btn-primary" onClick={createTodo}>
              + Add
            </button>
          </div>
          {isLoading ? (
            <p className="muted">Loading todos…</p>
          ) : todos.length === 0 ? (
            <p className="muted">No todos yet. Add your first one above.</p>
          ) : (
            <ul>
              {todos.map((todo) => (
                <li key={todo.id}>{todo.content}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
