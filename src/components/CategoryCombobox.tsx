import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  id: string;
  name: string;
}

export default function CategoryCombobox({
  categories,
  value,
  onChange,
  onCreate,
}: {
  categories: CategoryOption[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  /** Called when the typed text doesn't match an existing category. Should insert it and return the new id, or null on failure. */
  onCreate: (name: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = categories.find((c) => c.id === value);
  const exactMatch = categories.some((c) => c.name.toLowerCase() === search.trim().toLowerCase());

  const handleCreate = async () => {
    const name = search.trim();
    if (!name || creating) return;
    setCreating(true);
    const id = await onCreate(name);
    setCreating(false);
    if (id) {
      onChange(id);
      setSearch("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? selected.name : <span className="text-muted-foreground">Select or add a category…</span>}
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search or add category…" value={search} onValueChange={setSearch} />
          <CommandList>
            {categories.length > 0 && (
              <CommandGroup>
                {categories.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name}
                    onSelect={() => { onChange(c.id); setSearch(""); setOpen(false); }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {search.trim() && !exactMatch && (
              <CommandGroup>
                <CommandItem value={`create-${search}`} onSelect={handleCreate} disabled={creating}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create "{search.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
            {categories.length === 0 && !search.trim() && (
              <CommandEmpty>Type to add your first category.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
