import EmojiPicker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";

interface ActionEmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function ActionEmojiPicker({ onSelect }: ActionEmojiPickerProps) {
  const selectEmoji = (emoji: EmojiClickData) => {
    onSelect(emoji.emoji);
  };

  return (
    <EmojiPicker
      autoFocusSearch
      emojiStyle={EmojiStyle.NATIVE}
      height="min(360px, calc(100vh - 170px))"
      lazyLoadEmojis
      onEmojiClick={selectEmoji}
      previewConfig={{ showPreview: false }}
      searchPlaceholder="Search all emoji"
      theme={Theme.AUTO}
      width="100%"
    />
  );
}
