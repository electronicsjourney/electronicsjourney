import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Eye } from "lucide-react";

export function ProjectCard({ project }: { project: any }) {
  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      className="group glass rounded-2xl overflow-hidden hover:glow-soft transition-all hover:-translate-y-1"
    >
      <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
        {project.cover_image ? (
          <img src={project.cover_image} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full grid place-items-center">
            <span className="text-5xl opacity-30">⚡</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold line-clamp-1 group-hover:gradient-text transition">{project.title}</h3>
        {project.description && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {project.likes_count ?? 0}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {project.comments_count ?? 0}</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {project.views ?? 0}</span>
          {project.profiles?.username && <span className="ml-auto">@{project.profiles.username}</span>}
        </div>
      </div>
    </Link>
  );
}
