"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { UserTable } from "@/components/admin/user-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStore } from "@/store/user-store";
import { Search, UserPlus, Download, Filter, User as UserIcon } from "lucide-react";
import type { UserRole, UserStatus } from "@/types/user";

export default function UsersPage() {
  const { users, setFilters, clearFilters, filters, loadUsersFromDB } = useUserStore();
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const hasLoadedOnce = useRef(false);

  // فقط یک بار هنگام ورود به صفحه بارگذاری شود تا بعد از تغییر وضعیت، refetch دادهٔ قدیمی را بازنویسی نکند
  useEffect(() => {
    if (hasLoadedOnce.current) return;
    hasLoadedOnce.current = true;
    useUserStore.getState().loadUsersFromDB();
  }, []);

  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.phone?.includes(query)
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }

    return filtered;
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setFilters({ search: query });
    } else {
      clearFilters();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              کاربران ({filteredUsers.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant={showFilters ? "default" : "outline"} 
                onClick={() => setShowFilters(!showFilters)} 
                size="sm"
              >
                <Filter className="ml-2 h-4 w-4" />
                فیلتر
              </Button>
              <Button variant="outline" size="sm">
                <Download className="ml-2 h-4 w-4" />
                خروجی CSV
              </Button>
              <Button size="sm">
                <UserPlus className="ml-2 h-4 w-4" />
                افزودن کاربر
              </Button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border/20">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">جستجو</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="جستجو در کاربران..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">نقش</label>
                  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="همه نقش‌ها" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">همه نقش‌ها</SelectItem>
                      <SelectItem value="admin">مدیر</SelectItem>
                      <SelectItem value="moderator">ناظر</SelectItem>
                      <SelectItem value="user">کاربر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">وضعیت</label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="همه وضعیت‌ها" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                      <SelectItem value="active">فعال</SelectItem>
                      <SelectItem value="inactive">غیرفعال</SelectItem>
                      <SelectItem value="suspended">معلق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(searchQuery || roleFilter !== "all" || statusFilter !== "all") && (
                <div className="mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setRoleFilter("all");
                      setStatusFilter("all");
                      clearFilters();
                    }}
                  >
                    <Filter className="ml-2 h-4 w-4" />
                    پاک کردن فیلترها
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <UserTable users={filteredUsers} />
        </CardContent>
      </Card>
    </div>
  );
}


