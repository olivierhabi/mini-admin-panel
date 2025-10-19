"use client";
import React, { useEffect, useState } from "react";
import UsersList from "../components/users"
import UsersStats from "@/components/users-stats";
import { Button } from "@/components/ui/button"


export default function Home() {
  const [open, setOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  return (
    <div className=" px-40 pt-10 flex flex-col">
      <div className="py-2">
        <Button onClick={() => setOpen(true)} className="px-4" variant="outline">Create user</Button>
      </div>
      <div className="flex  space-x-5 ">
        <UsersList
          setOpen={setOpen}
          open={open}
          refreshTrigger={refreshTrigger}
          setRefreshTrigger={setRefreshTrigger}
        />
        <UsersStats refreshTrigger={refreshTrigger} />
      </div>

    </div>

  );
}
