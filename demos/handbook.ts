import kindly from "../mod.ts";

const black = "0";
// const red = "1";
// const green = "2";
// const yellow = "3";
// const blue = "4";
// const magenta = "5";
// const cyan = "6";
// const white = "7";
// const bright_black = "8";
// const bright_red = "9";
// const bright_green = "10";
// const bright_yellow = "11";
// const bright_blue = "12";
// const bright_magenta = "13";
// const bright_cyan = "14";
// const bright_white = "15";

export default kindly.handbook("Maui")
  .group({
    doc: "Do some heavy lifting",
    tags: ["raise"],
    apply: (handbook) => {
      return handbook
        .task({
          doc: "Lift the sky",
          tags: ["sky"],
          action: animate(
            "sky",
            "print",
            "--print-head-easing=linear",
            "--print-head-return-speed=45",
            "--print-speed=15",
            "--final-gradient-direction=vertical",
            "--final-gradient-stops",
            black,
            "ff3333",
            "ffaa33",
            "66aaff",
            "66aaff",
            "ffffff",
            "ffffff",
            "ffffff",
            "ffffff",
          ),
        })
        .task({
          doc: "Surface an island",
          tags: ["island"],
          action: animate(
            "island",
            "overflow",
            "--overflow-speed=5",
            "--overflow-cycles-range=2-2",
            "--overflow-gradient-stops",
            black,
            "66aaff",
            "66aaff",
            black,
            "--final-gradient-direction=vertical",
            "--final-gradient-stops",
            "66aaff",
            "66aaff",
            "66aaff",
            "ffccaa",
            "ffccaa",
            "ffccaa",
            "66ffaa",
            "66ffaa",
            "66ffaa",
            "66ffaa",
            "66ffaa",
            black,
          ),
        });
    },
  })
  .task({
    doc: "Regulate daylight",
    tags: ["snare-sun"],
    action: animate(
      "sun",
      "beams",
      "--beam-delay=1",
      "--beam-gradient-frames=1",
      "--beam-column-speed-range=3-3",
      "--beam-row-speed-range=6-6",
      "--beam-gradient-stops",
      "ffffff",
      "--final-wipe-speed=120",
      "--final-gradient-direction=radial",
      "--final-gradient-frames=1",
      "--final-gradient-stops",
      "ff3333",
      "ffaa33",
      "ffaa66",
      "ffff66",
      "ffffff",
    ),
  })
  .task({
    doc: "Bring the heat",
    tags: ["steal-fire"],
    action: animate(
      "fire",
      "spotlights",
      "--beam-width-ratio=1.8",
      "--beam-falloff=0.5",
      "--search-duration=100",
      "--search-speed-range=0.63-0.63",
      "--final-gradient-direction=vertical",
      "--final-gradient-stops",
      "ffccaa",
      "ffccaa",
      "ffccaa",
      "ffccaa",
      "ffccaa",
      "ff5555",
      "ffaa33",
      "ffaa33",
      "ffaa66",
      "ffff66",
      "ffff66",
    ),
  });

function animate(
  file: string,
  effect: string,
  ...options: Array<string>
): () => Promise<kindly.Result<undefined, undefined>> {
  const offset_x = 30;

  return kindly.just(
    "sh",
    "-euc",
    `
    trap "set +e; cleanup" EXIT INT
    csi() {
      printf "\x1b[%s" "$@"
    }
    cleanup() {
      trap "" EXIT
      # Show cursor, reset style
      csi ?25h m
      echo
      exit 0
    }

    # Hide and position cursor for spinner
    csi ?25l F ${offset_x}C

    sleep 0.3

    # Show spinner
    for frame in ⡀ ⡄ ⡆ ⡇ ⡏ ⡟ ⡿ ⣿ ⣻ ⣹ ⣸ ⣰ ⣠ ⣀ ⡀; do
      csi D "1;38;2;255;255;255m"
      printf %s $frame
      sleep 0.15
    done

    # Clear spinner, reset cursor position
    csi D J E

    # Show animation
    tte --input-file=art/${file} --anchor-canvas=s \
      ${effect} ${options.join(" ")}

    # Hide cursor
    csi ?25l

    sleep 1
    `,
  );
}
