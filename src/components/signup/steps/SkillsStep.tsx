"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Skill } from "@/types/signup";

interface Props {
  availableSkills: Skill[];
  skillsLoading: boolean;
  skillFilter: "ALL" | "SKILL" | "JOB";
  setSkillFilter: (v: "ALL" | "SKILL" | "JOB") => void;
  selectedSkillIds: number[];
  toggleSkill: (id: number) => void;
  isLoading: boolean;
  handleSkillsSubmit: () => void;
  setStep: (s: any) => void;
}

export function SkillsStep({
  availableSkills,
  skillsLoading,
  skillFilter,
  setSkillFilter,
  selectedSkillIds,
  toggleSkill,
  isLoading,
  handleSkillsSubmit,
  setStep,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = availableSkills.filter((s) => {
    const matchesFilter = skillFilter === "ALL" || s.type === skillFilter;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text-primary mb-1">
        What do you offer?
      </h2>
      <p className="text-sm text-text-secondary mb-1">
        Select up to 3 skills or job roles. Skills make you discoverable to
        clients. Job roles make you visible to employers.
      </p>
      <div className="bg-surface rounded-xl p-3 text-xs text-text-secondary mb-2">
        <span className="font-semibold text-text-primary">Tip:</span> Selecting
        a Job type skill lists you as an employee available for hire. Selecting
        a Skill type lists you as an artisan. You can select both.
      </div>

      {/* Search */}
      <Input
        placeholder="Search skills or job roles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["ALL", "SKILL", "JOB"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setSkillFilter(filter)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              skillFilter === filter
                ? "bg-primary text-white"
                : "bg-gray-100 text-text-secondary hover:bg-gray-200"
            }`}
          >
            {filter === "ALL" ? "All" : filter === "SKILL" ? "Artisan Skills" : "Job Roles"}
          </button>
        ))}
      </div>

      {/* Selected pills */}
      {selectedSkillIds.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-100">
          {availableSkills
            .filter((s) => selectedSkillIds.includes(s.id))
            .map((s) => (
              <span
                key={s.id}
                onClick={() => toggleSkill(s.id)}
                className="flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs font-medium rounded-full cursor-pointer"
              >
                {s.name} ×
              </span>
            ))}
        </div>
      )}

      <p className="text-xs text-text-secondary">{selectedSkillIds.length}/3 selected</p>

      {skillsLoading ? (
        <div className="text-center py-8 text-text-secondary text-sm">Loading skills...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          No results for "{search}"
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {filtered.map((skill) => {
            const selected = selectedSkillIds.includes(skill.id);
            return (
              <button
                key={skill.id}
                onClick={() => toggleSkill(skill.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <span className="text-sm text-text-primary">{skill.name}</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    skill.type === "SKILL"
                      ? "bg-accent/20 text-accent"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {skill.type === "SKILL" ? "Artisan" : "Job Role"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep("setup")}>
          Back
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          isLoading={isLoading}
          onClick={handleSkillsSubmit}
        >
          Continue to Payment →
        </Button>
      </div>
    </div>
  );
}