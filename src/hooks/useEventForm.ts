import { useState } from "react";
import { z } from "zod";
import { createEventSchema } from "@/lib/validation/schemas";

export function useEventForm(initialData?: z.infer<typeof createEventSchema>) {
  const [formData, setFormData] = useState<z.infer<typeof createEventSchema>>(
    initialData || {
      chapterId: "",
      title: "",
      type: "WORKSHOP",
      startsAt: new Date(),
      endsAt: new Date(),
      venue: "",
      objectives: "",
      outcomes: "",
      participantCount: 0,
      tags: [],
      speakers: [],
      budgetLines: [],
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: string, value: Date) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSpeakerChange = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const newSpeakers = [...prev.speakers!];
      newSpeakers[index] = { ...newSpeakers[index], [field]: value };
      return { ...prev, speakers: newSpeakers };
    });
  };

  const addSpeaker = () => {
    setFormData((prev) => ({
      ...prev,
      speakers: [...(prev.speakers || []), { name: "", designation: "", bio: "" }],
    }));
  };

  const removeSpeaker = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      speakers: prev.speakers?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleBudgetLineChange = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const newBudgetLines = [...prev.budgetLines!];
      newBudgetLines[index] = {
        ...newBudgetLines[index],
        [field]: field === "amount" ? parseFloat(value) * 100 : value,
      };
      return { ...prev, budgetLines: newBudgetLines };
    });
  };

  const addBudgetLine = () => {
    setFormData((prev) => ({
      ...prev,
      budgetLines: [...(prev.budgetLines || []), { item: "", amount: 0, notes: "" }],
    }));
  };

  const removeBudgetLine = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      budgetLines: prev.budgetLines?.filter((_, i) => i !== index) || [],
    }));
  };

  const validate = () => {
    try {
      createEventSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          fieldErrors[err.path[0]] = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  return {
    formData,
    errors,
    handleChange,
    handleDateChange,
    handleSpeakerChange,
    addSpeaker,
    removeSpeaker,
    handleBudgetLineChange,
    addBudgetLine,
    removeBudgetLine,
    validate,
  };
}
