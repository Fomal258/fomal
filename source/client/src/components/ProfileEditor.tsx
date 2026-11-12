import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import ImageCropper from "@/components/ImageCropper";
import ListRows from "@/components/ListRows";
import { bundledPhotos, findPhotoFile, photoPath, probePhoto } from "@/data/photos";
import type { SiteDesign } from "@/lib/design";
import { defaultCrop, wrestlerLinks, wrestlerNames, type ImageCrop, type Wrestler } from "@/lib/storage";
import { useDialogFocus } from "@/lib/a11y";

type Props = {
  wrestler?: Wrestler | null; // null이면 "새 선수 추가"
  design: SiteDesign;
  onSave: (data: { names: string[]; image: string; imageCrop: ImageCrop; bio: string; links: string[] }) => void | Promise<void>;
  onClose: () => void;
  onDelete?: () => void;
};

const MAX_IMAGE_MB = 10; // 사진 최대 용량

// photos/ 로 시작하면 업로드가 아니라 파일 참조입니다.
const isPhotoFile = (image: string) => image.startsWith("photos/");

// 선수 추가/수정 팝업
export default function ProfileEditor({ wrestler, design, onSave, onClose, onDelete }: Props) {
  // 입력값은 "저장"을 누를 때까지 여기 담아 둡니다.
  const [names, setNames] = useState<string[]>(() => (wrestler ? wrestlerNames(wrestler) : [""]));
  const [image, setImage] = useState(wrestler?.image ?? "");
  const [links, setLinks] = useState<string[]>(() => (wrestler ? wrestlerLinks(wrestler) : []));
  const [bio, setBio] = useState(wrestler?.bio ?? "");
  const [crop, setCrop] = useState<ImageCrop>(wrestler?.imageCrop ?? defaultCrop);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false); // 사진 읽는 중
  const [photoFiles, setPhotoFiles] = useState<string[]>(() => bundledPhotos); // 빌드에 포함된 목록으로 시작
  const [photoIndexState, setPhotoIndexState] = useState<"loading" | "ok" | "missing">(() =>
    bundledPhotos.length ? "ok" : "loading"
  );
  const [manualPhoto, setManualPhoto] = useState(() =>
    image.startsWith("photos/") ? decodeURI(image.replace("photos/", "")) : ""
  ); // 목록이 없을 때 직접 입력
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 목록 새로고침: 빌드 이후에 추가한 사진을 읽어 옵니다.
  // file:// 로 열면 fetch 가 막히므로, 실패해도 내장 목록(bundledPhotos)을 그대로 사용합니다.
  const loadPhotoIndex = () => {
    setPhotoIndexState("loading");
    fetch(`${import.meta.env.BASE_URL}photos/index.json`)
      .then(response => (response.ok ? response.json() : Promise.reject(new Error("no index"))))
      .then((list: unknown) => {
        const names = Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
        setPhotoFiles(names.length ? names : bundledPhotos);
        setPhotoIndexState(names.length || bundledPhotos.length ? "ok" : "missing");
      })
      .catch(() => {
        // 내장 목록이 있으면 그걸로 계속 동작
        setPhotoFiles(bundledPhotos);
        setPhotoIndexState(bundledPhotos.length ? "ok" : "missing");
      });
  };

  useEffect(() => {
    loadPhotoIndex();
  }, []);

  // 편집창을 열었을 때 아직 지정된 이미지가 없으면 photos/ 폴더에서 선수 이름과 같은 파일을 자동으로 찾아 연결합니다.
  useEffect(() => {
    if (image) return;
    const clean = names.map(n => n.trim()).filter(Boolean);
    if (!clean.length) return;
    let cancelled = false;
    probePhoto(clean).then(found => {
      if (!cancelled && found) {
        setImage(found);
        setPhotoFiles([...bundledPhotos]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 이름과 같은 사진 파일을 photos/ 폴더에서 즉시 찾아 연결합니다. (새로 넣은 파일도 실시간 탐색)
  const autoMatchPhoto = async () => {
    const clean = names.map(n => n.trim()).filter(Boolean);
    if (!clean.length) {
      setError("먼저 선수 이름을 입력해 주세요.");
      return;
    }
    for (const name of clean) {
      const file = findPhotoFile(name, photoFiles);
      if (file) {
        setImage(photoPath(file));
        setManualPhoto(file);
        setError("");
        return;
      }
    }
    const found = await probePhoto(clean);
    if (found) {
      setImage(found);
      setPhotoFiles([...bundledPhotos]);
      setManualPhoto(decodeURI(found.replace(/^photos\//, "")));
      setError("");
      return;
    }
    setError(`photos/ 폴더에서 '${clean[0]}.jpg' (또는 .png, .webp) 파일을 찾지 못했습니다.`);
  };

  // Esc 로 닫기
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // 고른 사진을 data URL 로 읽어 미리보기에 넣습니다.
  const onPickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 선택할 수 있습니다.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`이미지는 ${MAX_IMAGE_MB}MB 이하로 선택해 주세요.`);
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    setReading(true);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage(reader.result);
        setError("");
      } else {
        setError("이미지를 읽지 못했습니다. 다시 시도해 주세요.");
      }
    };
    reader.onerror = () => setError("이미지를 읽지 못했습니다. 다시 시도해 주세요.");
    reader.onloadend = () => setReading(false);
    reader.readAsDataURL(file);
  };

  // 이름/링크를 검사한 뒤 부모(Home)에게 저장을 요청합니다.
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (reading) return;

    // 빈 줄은 버립니다. 이름은 첫 번째 칸이 화면에 보이는 이름이 됩니다.
    const cleanedNames = names.map(name => name.trim()).filter(Boolean);
    if (cleanedNames.length === 0) {
      setError("이름을 하나 이상 입력해 주세요.");
      return;
    }

    // 링크는 http(s) 주소만, 입력한 순서 그대로 저장합니다.
    const cleanedLinks: string[] = [];
    for (const link of links) {
      const trimmed = link.trim();
      if (!trimmed) continue;
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad");
        cleanedLinks.push(parsed.href);
      } catch {
        setError("프로필 링크는 http:// 또는 https://로 시작하는 주소만 입력해 주세요.");
        return;
      }
    }

    try {
      await onSave({ names: cleanedNames, image, imageCrop: crop, bio: bio.trim(), links: cleanedLinks });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "저장에 실패했습니다.");
    }
  };

  const modalRef = useRef<HTMLFormElement | null>(null);
  useDialogFocus(modalRef);

  return (
    <div
      className="editor-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        ref={modalRef}
        className="editor-modal"
        style={
          {
            "--profile-modal-bg": design.profileModalBg,
            "--profile-modal-header-bg": design.profileModalHeaderBg,
            "--profile-modal-text": design.profileModalText,
            "--profile-modal-accent": design.profileModalAccent,
            "--profile-modal-field-bg": design.profileModalFieldBg,
          } as CSSProperties
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
        aria-describedby={error ? "profile-editor-error" : undefined}
        onSubmit={onSubmit}
        noValidate
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="editor-header">
          <h2 id="profile-editor-title">{wrestler ? "프로필 수정" : "새 프로필"}</h2>
          <button className="editor-secondary" type="button" onClick={onClose} aria-label="프로필 편집 닫기">
            닫기
          </button>
        </header>

        <div className="editor-body">
          {/* 사진 미리보기 / 위치·크기 조절 */}
          {image ? (
            <ImageCropper src={image} crop={crop} onChange={setCrop} />
          ) : (
            <div className="editor-preview" aria-label="이미지 없음">
              <span aria-hidden="true">이미지 없음</span>
            </div>
          )}

          {/* 사진 선택 */}
          <div className="editor-upload">
            <label htmlFor="profile-editor-image">선수 이미지</label>
            <input ref={fileInputRef} id="profile-editor-image" type="file" accept="image/*" disabled={reading} onChange={onPickImage} />
            <button className="editor-secondary" type="button" disabled={reading} onClick={() => fileInputRef.current?.click()}>
              이미지 선택
            </button>
          </div>

          {/* photos 폴더의 파일을 경로로 연결 (브라우저와 무관하게 동일하게 보임) */}
          <div className="editor-photo-files">
            <label htmlFor="profile-editor-photo">사진 파일 (photos 폴더)</label>
            <div className="editor-photo-row">
              <select
                id="profile-editor-photo"
                value={isPhotoFile(image) ? image : ""}
                onChange={event => {
                  setImage(event.target.value);
                  if (event.target.value) setError("");
                }}
              >
                <option value="">선택 안 함</option>
                {photoFiles.map(file => (
                  <option key={file} value={photoPath(file)}>
                    {file}
                  </option>
                ))}
              </select>
              <button className="editor-secondary" type="button" onClick={autoMatchPhoto}>
                이름으로 찾기
              </button>
            </div>
            {photoIndexState === "missing" && (
              <p className="editor-hint">
                photos/index.json 을 찾지 못했습니다. <code>npm run photos</code> 로 목록을 만들거나, 아래에 파일명을 직접 입력하세요.
              </p>
            )}
            {photoIndexState === "ok" && photoFiles.length === 0 && (
              <p className="editor-hint">photos 폴더가 비어 있습니다. 사진을 넣고 목록 새로고침을 눌러 주세요.</p>
            )}

            <div className="editor-photo-row">
              <input
                value={manualPhoto}
                onChange={event => setManualPhoto(event.target.value)}
                onKeyDown={event => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  setImage(manualPhoto.trim() ? photoPath(manualPhoto.trim()) : "");
                }}
                onBlur={() => {
                  if (manualPhoto.trim()) setImage(photoPath(manualPhoto.trim()));
                }}
                placeholder="폴더 내 파일명 직접 입력 (예: Alex Shelley.jpg)"
                aria-label="사진 파일명 직접 입력"
              />
              <button className="editor-secondary" type="button" onClick={() => setImage(manualPhoto.trim() ? photoPath(manualPhoto.trim()) : "")}>
                파일명 적용
              </button>
            </div>
            <p className="editor-hint">
              <code>photos/</code> 폴더에 <strong>선수 이름.jpg</strong> (또는 .png, .webp) 파일을 넣으면 별도 작업 없이 카드와 프로필에 자동 연동됩니다!
            </p>

            <button className="editor-photo-refresh" type="button" onClick={loadPhotoIndex}>
              목록 새로고침
            </button>
          </div>

          {/* 이름 (여러 개, 첫 번째가 화면 표시) */}
          <ListRows
            title="이름"
            hint="첫 번째 이름이 화면에 보입니다 · 드래그해서 순서를 바꿀 수 있습니다"
            items={names}
            onChange={value => {
              setNames(value);
              if (error === "이름을 하나 이상 입력해 주세요.") setError("");
            }}
            placeholder="선수 이름"
            addLabel="+ 이름 추가"
            emptyText="이름이 없습니다. 아래 버튼으로 추가하세요."
          />

          {/* 링크 (주소만, 여러 개) */}
          <ListRows
            title="링크"
            hint="드래그해서 순서를 바꿀 수 있습니다"
            items={links}
            onChange={value => {
              setLinks(value);
              if (error.startsWith("프로필 링크")) setError("");
            }}
            placeholder="https://example.com"
            addLabel="+ 링크 추가"
            type="url"
            emptyText="아직 링크가 없습니다. 링크가 없으면 사진을 눌렀을 때 선수 정보가 열립니다."
          />

          {/* 소개 */}
          <div className="editor-field">
            <label htmlFor="profile-editor-bio">선수 정보 / 소개</label>
            <textarea
              id="profile-editor-bio"
              value={bio}
              onChange={event => setBio(event.target.value)}
              placeholder="선수 소개, 소속, 특징 등을 입력하세요."
              rows={5}
            />
          </div>

          {error && (
            <p className="editor-error" id="profile-editor-error" role="alert">
              {error}
            </p>
          )}

          <div className="editor-actions">
            {wrestler && onDelete && (
              <button className="editor-delete" type="button" onClick={onDelete}>
                삭제
              </button>
            )}
            <span className="editor-actions-spacer" aria-hidden="true" />
            <button className="editor-secondary" type="button" onClick={onClose}>
              취소
            </button>
            <button className="editor-primary" type="submit" disabled={reading}>
              {reading ? "이미지 읽는 중" : "저장"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
