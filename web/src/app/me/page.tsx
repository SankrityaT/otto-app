"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import AyinOtter from "@/components/otter/AyinOtter";
import FurSlider from "@/components/pond/FurSlider";
import type { Student } from "@/lib/data/crew";
import { api } from "@/lib/client/api";
import { useCameraChoice, useStudentId } from "@/lib/client/settings";

/** Wait this long after the slider stops before saving the colour. */
const SAVE_DELAY_MS = 400;

export default function MePage() {
  const [studentId, setStudentId] = useStudentId();
  const [camera, setCamera] = useCameraChoice();
  const [student, setStudent] = useState<Student | null>(null);
  const [furHue, setFurHue] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    api.students().then(({ students }) => {
      const me = students.find((s) => s.id === studentId) ?? null;
      setStudent(me);
      if (me) setFurHue(me.furHue);
    });
  }, [studentId]);

  function changeFur(hue: number) {
    setFurHue(hue);
    clearTimeout(saveTimer.current);
    if (student) saveTimer.current = setTimeout(() => api.setFurHue(student.id, hue), SAVE_DELAY_MS);
  }

  return (
    <AppShell>
      <div className="page flex flex-col gap-8">
        <h1 className="page__h">{student ? `${student.name}'s otter` : "Me"}</h1>

        {student && (
          <section className="custom" aria-labelledby="custom-h">
            <h2 id="custom-h" className="custom__h">
              Make it yours
            </h2>
            <div className="custom__body">
              <div className="custom__preview">
                <AyinOtter motion="idle" furHue={furHue} size="100%" alt="" />
              </div>
              <FurSlider value={furHue} onChange={changeFur} />
            </div>
          </section>
        )}

        <fieldset className="choice">
          <legend className="choice__label">Ayin&apos;s eyes</legend>
          <div className="choice__opts">
            {(
              [
                ["this-device", "This phone"],
                ["screen", "A shared screen"],
                ["otter", "The otter"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className={`choice__opt ${camera === value ? "is-on" : ""}`}>
                <input type="radio" name="camera" checked={camera === value} onChange={() => setCamera(value)} />
                {label}
              </label>
            ))}
          </div>
          <p className="choice__help">Ayin looks only when you tap Done, Help or Show me, and never saves what it sees. Share a screen when the task is on a computer, or when there is no camera.</p>
        </fieldset>

        <button className="btn btn--quiet self-start" onClick={() => setStudentId(null)}>
          Switch student
        </button>
      </div>
    </AppShell>
  );
}
