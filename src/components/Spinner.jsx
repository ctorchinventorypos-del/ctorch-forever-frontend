// A small loading spinner.
export default function Spinner({ full }) {
  if (full) {
    return (
      <div className="center-spin">
        <div className="spin" />
      </div>
    );
  }
  return <div className="spin" />;
}
