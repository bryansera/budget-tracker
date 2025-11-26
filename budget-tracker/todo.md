
  Main factors:
  1. ResponsiveContainer height (line 107): height={600} - sets total container height to 600px
  2. Pie positioning (lines 112-118):
    - cy="50%" - centers the pie vertically at 50%
    - outerRadius="35%" - pie uses only 35% of container (70% diameter total)
    - This leaves ~15% space above and below

  Other factors:
  3. Paper padding (line 103): p: 3 adds 24px padding around everything
  4. Margin between charts (line 142): mt: 3 adds 24px between pie and bar chart

  To reduce the white space, you could:
  - Reduce the height={600} to something like height={400} or height={500}
  - Increase the outerRadius="35%" to something like outerRadius="45%"
  - Adjust cy to move the pie up or down
