"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function RoleSettings() {
  const supabase = createClientComponentClient();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_roles")
      .select("id, user_id, role");
    if (error) console.error(error);
    else setUsers(data);
    setLoading(false);
  };

  const updateRole = async (id: number, role: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role })
      .eq("id", id);
    if (error) alert(error.message);
    else fetchRoles();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pengaturan Role User</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">User ID</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border">
              <td className="p-2 border">{u.user_id}</td>
              <td className="p-2 border">{u.role}</td>
              <td className="p-2 border">
                <select
                  value={u.role}
                  onChange={(e) => updateRole(u.id, e.target.value)}
                  className="p-1 border rounded"
                >
                  <option value="staff">Staff</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
