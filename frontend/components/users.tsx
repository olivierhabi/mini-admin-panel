"use client";
import React, { useEffect, useState, useRef } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createVerify } from 'crypto';
import protobuf from "protobufjs";
import { toast } from "sonner"
import moment from 'moment';

moment.updateLocale('en', {
    relativeTime: {
        s: 'now',
        ss: '%ss',
        m: "1m",
        mm: "%dm",
        h: "1h",
        hh: "%dh",
        d: "1d",
        dd: "%dd",
        w: "1w",
        ww: "%dw",
        M: "1mo",
        MM: "%dmo",
        y: "1y",
        yy: "%dy"
    }
});

type User = {
    id: number;
    email: string;
    role: string | number;
    status: string | number;
    emailHash?: string;
    signature?: string;
    createdAt: number;
};

interface UsersListProps {
    setOpen: (open: boolean) => void;
    open: boolean;
    refreshTrigger: number;
    setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
}


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

const PROTO_PATH = "/protos/users.proto";
const PUBLIC_KEY = "/keys/public.pem";

const UsersList = ({ setOpen, open, refreshTrigger, setRefreshTrigger }: UsersListProps) => {

    const [data, setData] = useState<User[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const rootRef = useRef<protobuf.Root | null>(null);

    const [role, setRole] = useState('')
    const [status, setStatus] = useState('')
    const [loadingUser, setLoadingUser] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [deletingUser, setDeletingUser] = useState<User | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    const publicKeyRef = useRef<string | null>(null);

    const verify = async (message: string, signatureBase64: string, publicKeyPem: string) => {
        const verifier = createVerify('sha384');
        verifier.update(message);
        verifier.end();
        return verifier.verify(publicKeyPem, signatureBase64, 'base64');
    };

    const fetchUsers = async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            if (!rootRef.current) {
                const t = await (await fetch(PROTO_PATH, { signal })).text();
                rootRef.current = protobuf.parse(t).root;
            }

            if (!publicKeyRef.current) {
                publicKeyRef.current = await (await fetch(PUBLIC_KEY, { signal })).text();
            }

            const url = `${BACKEND_URL}/users/export`;
            const res = await fetch(url, { headers: { Accept: "application/octet-stream" }, signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const buf = new Uint8Array(await res.arrayBuffer());
            const Users = rootRef.current!.lookupType("users.Users");
            const decoded = Users.decode(buf);

            const obj = Users.toObject(decoded, { longs: String, enums: String, defaults: true }) as any;
            const mapped: User[] = (obj.users || []).map((u: any) => ({
                id: Number(u.id),
                email: u.email || "",
                emailHash: u.emailHash,
                signature: u.signature,
                role: u.role,
                status: u.status,
                createdAt: Number(u.createdAt),
            }));

            const verified: User[] = [];
            for (const u of mapped) {
                try {
                    const ok = await verify(u.emailHash as string, u.signature as string, publicKeyRef.current!);
                    if (ok) verified.push(u);
                } catch (err) {
                    console.warn('verify failed for user', u.id, err);
                }
            }

            setData(verified);
        } catch (e: any) {
            if (e.name !== "AbortError") {
                setError(String(e.message || e));
                setData(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const ctrl = new AbortController();
        fetchUsers(ctrl.signal);
        return () => ctrl.abort();
    }, []);

    const handleDelete = async () => {
        if (!deletingUser) return;

        try {
            const response = await fetch(`${BACKEND_URL}/users/${deletingUser.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            toast("User deleted successfully!");
            await fetchUsers();
            setRefreshTrigger((prev: number) => prev + 1);
        } catch (error) {
            console.error('Error deleting user:', error);
            toast("Failed to delete user. Please try again.");
        } finally {
            setDeletingUser(null);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setRole(String(user.role).toLowerCase());
        setStatus(String(user.status));
        setOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoadingUser(true)
        setFormError(null)

        const form = e.currentTarget

        const formData = new FormData(form)

        let userData: any = {};

        if (editingUser) {
            const email = formData.get('email') as string;
            const currentRole = role.toUpperCase();
            const currentStatus = status.toUpperCase();

            if (email !== editingUser.email) {
                userData.email = email;
            }
            if (currentRole !== String(editingUser.role).toUpperCase()) {
                userData.role = currentRole;
            }
            if (currentStatus !== String(editingUser.status).toUpperCase()) {
                userData.status = currentStatus;
            }

        } else {
            userData = {
                email: formData.get('email') as string,
                role: role.toUpperCase(),
                status: status,
            };
        }

        try {
            const url = editingUser
                ? `${BACKEND_URL}/users/${editingUser.id}`
                : `${BACKEND_URL}/users`;

            const method = editingUser ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            })


            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || errorData.error || `Failed to ${editingUser ? 'update' : 'create'} user`;
                setFormError(errorMessage);
                return;
            }

            // Only parse JSON if response was ok
            const data = await response.json();

            setOpen(false);
            setRole('');
            setStatus('');
            setEditingUser(null);
            form.reset();

            toast(`User ${editingUser ? 'updated' : 'created'} successfully!`);
            setRefreshTrigger((prev: number) => prev + 1);

            await fetchUsers()
        } catch (error: any) {
            console.log(error)
            console.error(`Error ${editingUser ? 'updating' : 'creating'} user:`, error)
            toast(error.message || `Failed to ${editingUser ? 'update' : 'create'} user. Please try again.`)
        } finally {
            setLoadingUser(false)
        }
    }

    const handleDialogClose = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setEditingUser(null);
            setRole('');
            setStatus('');
            setFormError(null);
        }
    };

    return (
        <>
            <Card className="w-[800px] h-[500px]">
                <CardHeader>
                    <CardTitle>Users List</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px] overflow-y-auto mb-6">
                    <div className="p-4">
                        {loading && <div>Loading…</div>}
                        {error && <div className="text-red-600">{error}</div>}
                        {!loading && data && data.length === 0 && <div>No users</div>}
                        {data && data.length > 0 && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className=""></TableHead>
                                        <TableHead className="w-[150px]">Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Creation Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((u, idx) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">{idx + 1}.</TableCell>
                                            <TableCell className="font-medium">{u.email}</TableCell>
                                            <TableCell>{u.role}</TableCell>
                                            <TableCell>{u.status}</TableCell>
                                            <TableCell className="text-right">
                                                {u.createdAt ? moment(u.createdAt).fromNow() : '-'}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2 pl-5">
                                                <Button onClick={() => setDeletingUser(u)} className="h-7 w-7 p-0 !bg-red-500/50" variant="outline"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-2 w-2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                                </Button>
                                                <Button
                                                    onClick={() => handleEdit(u)}
                                                    className="h-7 w-7 p-0 !bg-green-500/50"
                                                    variant="outline"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        strokeWidth={1.5}
                                                        stroke="currentColor"
                                                        className="h-2 w-2"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                                        />
                                                    </svg>
                                                </Button>
                                            </TableCell>


                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
            </Card>

            <>
                <Dialog open={open} onOpenChange={handleDialogClose}>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>{editingUser ? 'Edit user' : 'Create a user'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-3">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" defaultValue={editingUser?.email || ''} required />
                                </div>
                                <div className="grid gap-3">
                                    <Label htmlFor="role">Role</Label>
                                    <Select value={role} onValueChange={setRole} required>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Roles</SelectLabel>
                                                <SelectItem value="user">User</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-3">
                                    <Label htmlFor="role">Status</Label>
                                    <Select value={status} onValueChange={setStatus} required>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Status</SelectLabel>
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {formError && (
                                <div className="text-red-600 text-sm mb-4 p-3 rounded-md">
                                    {formError}
                                </div>
                            )}
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={loadingUser}>
                                    {loadingUser ? (editingUser ? 'Updating...' : 'Creating...') : 'Save changes'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </>

            <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user
                            {deletingUser && ` "${deletingUser.email}"`} and remove their data from the servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )

}

export default UsersList